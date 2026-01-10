// SPDX-License-Identifier: GPL-2.0 OR BSD-3-Clause
#include "vmlinux.h"
#include <bpf/bpf_endian.h>
#include <bpf/bpf_helpers.h>

#define MAX_BACKENDS 16
#define ETH_P_IP 0x0800

// Backend pool map
struct {
  __uint(type, BPF_MAP_TYPE_ARRAY);
  __type(key, __u32);
  __type(value, __u32); // Backend IP address
  __uint(max_entries, MAX_BACKENDS);
} backend_pool SEC(".maps");

// Round-robin counter
struct {
  __uint(type, BPF_MAP_TYPE_ARRAY);
  __type(key, __u32);
  __type(value, __u32);
  __uint(max_entries, 1);
} rr_counter SEC(".maps");

// Frontend listener map (Ports to monitor)
struct {
  __uint(type, BPF_MAP_TYPE_HASH);
  __type(key, __be16);  // Port in network byte order
  __type(value, __u32); // Flags / Metadata
  __uint(max_entries, 256);
} frontend_listeners SEC(".maps");

// Performance statistics map
struct {
  __uint(type, BPF_MAP_TYPE_PERCPU_ARRAY);
  __uint(key_size, sizeof(__u32));
  __uint(value_size, sizeof(__u64));
  __uint(max_entries,
         8); // 0:PROCESSED, 1:REDIRECTED, 2:DROPPED, 3:PASSED, 4:ABORTED
} xdp_stats SEC(".maps");

static __always_inline void update_stats(__u32 key) {
  __u64 *val = bpf_map_lookup_elem(&xdp_stats, &key);
  if (val) {
    *val += 1;
  }
}

SEC("xdp")
int xdp_load_balancer(struct xdp_md *ctx) {
  void *data_end = (void *)(long)ctx->data_end;
  void *data = (void *)(long)ctx->data;

  update_stats(0); // Total processed

  // Parse Ethernet header
  struct ethhdr *eth = data;
  if ((void *)(eth + 1) > data_end)
    return XDP_PASS;

  // Only process IPv4
  if (eth->h_proto != bpf_htons(ETH_P_IP)) {
    update_stats(3); // Passed
    return XDP_PASS;
  }

  // Parse IP header
  struct iphdr *iph = (void *)(eth + 1);
  if ((void *)(iph + 1) > data_end)
    return XDP_PASS;

  // Only process TCP
  if (iph->protocol != IPPROTO_TCP) {
    update_stats(3); // Passed
    return XDP_PASS;
  }

  // Parse TCP header
  struct tcphdr *tcph = (void *)(iph + 1);
  if ((void *)(tcph + 1) > data_end)
    return XDP_PASS;

  // Dynamic Listener Lookup
  __be16 dest_port = tcph->dest;
  __u32 *is_monitored = bpf_map_lookup_elem(&frontend_listeners, &dest_port);
  if (!is_monitored) {
    update_stats(3); // Passed
    return XDP_PASS;
  }

  // Get round-robin counter
  __u32 key = 0;
  __u32 *counter = bpf_map_lookup_elem(&rr_counter, &key);
  if (!counter) {
    update_stats(4); // Aborted
    return XDP_PASS;
  }

  // Select backend (round-robin)
  __u32 backend_idx = *counter % MAX_BACKENDS;
  __u32 *backend_ip = bpf_map_lookup_elem(&backend_pool, &backend_idx);
  if (!backend_ip || *backend_ip == 0) {
    update_stats(4); // Aborted
    return XDP_PASS;
  }

  // Rewrite destination IP to backend
  __u32 old_daddr = iph->daddr;
  __u32 new_daddr = *backend_ip;
  iph->daddr = new_daddr;

  // Increment counter
  __sync_fetch_and_add(counter, 1);

  // Incremental checksum update for IP header
  // Formula: new_check = old_check + ~old_val + new_val
  __u32 check = iph->check;
  check = ~check & 0xFFFF;

  // Subtract old daddr (half-words)
  check += (~(old_daddr & 0xFFFF)) & 0xFFFF;
  check += (~(old_daddr >> 16)) & 0xFFFF;

  // Add new daddr (half-words)
  check += (new_daddr & 0xFFFF);
  check += (new_daddr >> 16);

  // Fold carries
  check = (check & 0xFFFF) + (check >> 16);
  check = (check & 0xFFFF) + (check >> 16);

  iph->check = ~check & 0xFFFF;

  update_stats(1); // Redirected
  return XDP_TX;   // Transmit modified packet
}

char __license[] SEC("license") = "Dual MIT/GPL";

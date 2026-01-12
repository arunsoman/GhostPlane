package db

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

type Store struct {
	db *sql.DB
}

func NewStore(dbPath string) (*Store, error) {
	// Ensure directory exists
	dir := filepath.Dir(dbPath)
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return nil, fmt.Errorf("failed to create db directory: %w", err)
		}
	}

	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open sqlite db: %w", err)
	}

	s := &Store{db: db}
	if err := s.init(); err != nil {
		return nil, err
	}

	return s, nil
}

func (s *Store) init() error {
	query := `
	CREATE TABLE IF NOT EXISTS system_settings (
		key TEXT PRIMARY KEY,
		value TEXT,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	CREATE TABLE IF NOT EXISTS deployments (
		id TEXT PRIMARY KEY,
		template_id TEXT,
		parameters TEXT,
		status TEXT,
		config TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	INSERT OR IGNORE INTO system_settings (key, value) VALUES ('setup_complete', 'false');
	`
	_, err := s.db.Exec(query)
	if err != nil {
		return fmt.Errorf("failed to initialize schema: %w", err)
	}
	return nil
}

// DeploymentRecord represents a row in the deployments table
type DeploymentRecord struct {
	ID         string
	TemplateID string
	Parameters string // JSON
	Status     string
	Config     string // JSON
	CreatedAt  string
}

func (s *Store) SaveDeployment(id, templateID string, params, config interface{}, status string) error {
	paramsJSON, _ := json.Marshal(params)
	configJSON, _ := json.Marshal(config)

	query := `INSERT OR REPLACE INTO deployments (id, template_id, parameters, status, config, created_at) 
	          VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`

	_, err := s.db.Exec(query, id, templateID, string(paramsJSON), status, string(configJSON))
	return err
}

func (s *Store) GetDeployment(id string) (*DeploymentRecord, error) {
	var d DeploymentRecord
	err := s.db.QueryRow("SELECT id, template_id, parameters, status, config, created_at FROM deployments WHERE id = ?", id).
		Scan(&d.ID, &d.TemplateID, &d.Parameters, &d.Status, &d.Config, &d.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &d, nil
}

func (s *Store) SetSetting(key, value string) error {
	_, err := s.db.Exec("INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)", key, value)
	return err
}

func (s *Store) GetSetting(key string) (string, error) {
	var value string
	err := s.db.QueryRow("SELECT value FROM system_settings WHERE key = ?", key).Scan(&value)
	if err == sql.ErrNoRows {
		return "", nil
	}
	return value, err
}

func (s *Store) IsSetupComplete() (bool, error) {
	val, err := s.GetSetting("setup_complete")
	return val == "true", err
}

func (s *Store) SaveRoutes(routes interface{}) error {
	data, err := json.Marshal(routes)
	if err != nil {
		return err
	}
	return s.SetSetting("l7_routes", string(data))
}

func (s *Store) LoadRoutes() (string, error) {
	return s.GetSetting("l7_routes")
}

func (s *Store) Close() error {
	return s.db.Close()
}

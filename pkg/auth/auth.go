package auth

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"time"

	jwt "github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidCredentials = errors.New("invalid username or password")
	ErrInvalidToken       = errors.New("invalid or expired token")
)

type Claims struct {
	Username string `json:"username"`
	jwt.RegisteredClaims
}

type AuthService struct {
	jwtSecret []byte
	users     map[string]string // username -> hashed password
}

func NewAuthService(jwtSecret, adminUsername, adminPassword string) (*AuthService, error) {
	// Hash the admin password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(adminPassword), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	return &AuthService{
		jwtSecret: []byte(jwtSecret),
		users: map[string]string{
			adminUsername: string(hashedPassword),
		},
	}, nil
}

// GenerateRandomSecret generates a random JWT secret for production use
func GenerateRandomSecret() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(bytes), nil
}

// Authenticate validates credentials and returns a JWT token
func (s *AuthService) Authenticate(username, password string) (string, error) {
	hashedPassword, exists := s.users[username]
	if !exists {
		return "", ErrInvalidCredentials
	}

	if err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password)); err != nil {
		return "", ErrInvalidCredentials
	}

	// Create JWT token
	claims := &Claims{
		Username: username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.jwtSecret)
}

// ValidateToken validates a JWT token and returns the username
func (s *AuthService) ValidateToken(tokenString string) (string, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return s.jwtSecret, nil
	})

	if err != nil || !token.Valid {
		return "", ErrInvalidToken
	}

	return claims.Username, nil
}

// ChangePassword changes the password for a user
func (s *AuthService) ChangePassword(username, newPassword string) error {
	if _, exists := s.users[username]; !exists {
		return errors.New("user not found")
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	s.users[username] = string(hashedPassword)
	return nil
}

-- Supabase PostgreSQL Schema for Clinical Placements Database
-- Run this in the Supabase SQL Editor

-- Create enum type for profession
CREATE TYPE profession_type AS ENUM ('PT', 'OT', 'PA');

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- Table: layers (5 rows) - Layer metadata for UI
-- ============================================
CREATE TABLE layers (
    id SERIAL PRIMARY KEY,
    layer_key VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color CHAR(7),
    default_visible BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_layers_layer_key ON layers(layer_key);

-- ============================================
-- Table: hrsa_sites (81,477 rows) - Healthcare providers
-- ============================================
CREATE TABLE hrsa_sites (
    id SERIAL PRIMARY KEY,
    site_name VARCHAR(500),
    state CHAR(2) NOT NULL,
    longitude NUMERIC(11, 7),
    latitude NUMERIC(10, 7),
    source VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_hrsa_sites_state ON hrsa_sites(state);
CREATE INDEX idx_hrsa_sites_coords ON hrsa_sites(latitude, longitude);
CREATE INDEX idx_hrsa_sites_name ON hrsa_sites(site_name);

CREATE TRIGGER update_hrsa_sites_updated_at
    BEFORE UPDATE ON hrsa_sites
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Table: schools (858 rows) - PT/OT/PA programs
-- ============================================
CREATE TABLE schools (
    id SERIAL PRIMARY KEY,
    program_row_id INTEGER,
    institution_name VARCHAR(300) NOT NULL,
    campus_name VARCHAR(200),
    state CHAR(2) NOT NULL,
    profession profession_type NOT NULL,
    program_name VARCHAR(200),
    accreditation_body VARCHAR(20),
    accreditation_status VARCHAR(200),
    address VARCHAR(500),
    longitude NUMERIC(11, 7),
    latitude NUMERIC(10, 7),
    source VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_schools_state ON schools(state);
CREATE INDEX idx_schools_profession ON schools(profession);
CREATE INDEX idx_schools_state_profession ON schools(state, profession);
CREATE INDEX idx_schools_coords ON schools(latitude, longitude);
CREATE INDEX idx_schools_name ON schools(institution_name);

CREATE TRIGGER update_schools_updated_at
    BEFORE UPDATE ON schools
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Table: post_secondary_schools (6,812 rows)
-- ============================================
CREATE TABLE post_secondary_schools (
    id SERIAL PRIMARY KEY,
    original_id INTEGER,
    institution_name VARCHAR(300) NOT NULL,
    state CHAR(2) NOT NULL,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(11, 7),
    source VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_post_secondary_state ON post_secondary_schools(state);
CREATE INDEX idx_post_secondary_coords ON post_secondary_schools(latitude, longitude);
CREATE INDEX idx_post_secondary_name ON post_secondary_schools(institution_name);

CREATE TRIGGER update_post_secondary_updated_at
    BEFORE UPDATE ON post_secondary_schools
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Table: military_sites (824 rows)
-- ============================================
CREATE TABLE military_sites (
    id SERIAL PRIMARY KEY,
    name VARCHAR(300) NOT NULL,
    state CHAR(2) NOT NULL,
    component VARCHAR(50),
    longitude NUMERIC(11, 7),
    latitude NUMERIC(10, 7),
    source VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_military_state ON military_sites(state);
CREATE INDEX idx_military_coords ON military_sites(latitude, longitude);
CREATE INDEX idx_military_name ON military_sites(name);

CREATE TRIGGER update_military_updated_at
    BEFORE UPDATE ON military_sites
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Table: native_american_reserves (693 rows)
-- ============================================
CREATE TABLE native_american_reserves (
    id SERIAL PRIMARY KEY,
    name VARCHAR(500) NOT NULL,
    state CHAR(2) NOT NULL,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(11, 7),
    source VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_native_american_state ON native_american_reserves(state);
CREATE INDEX idx_native_american_coords ON native_american_reserves(latitude, longitude);
CREATE INDEX idx_native_american_name ON native_american_reserves(name);

CREATE TRIGGER update_native_american_updated_at
    BEFORE UPDATE ON native_american_reserves
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Table: notes (coordinator annotations)
-- ============================================
CREATE TABLE notes (
    id SERIAL PRIMARY KEY,
    layer_key VARCHAR(50),
    entity_id INTEGER,
    state CHAR(2),
    note_text TEXT NOT NULL,
    author VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notes_layer_entity ON notes(layer_key, entity_id);
CREATE INDEX idx_notes_state ON notes(state);

CREATE TRIGGER update_notes_updated_at
    BEFORE UPDATE ON notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Seed layers table with initial data
-- ============================================
INSERT INTO layers (layer_key, display_name, table_name, description, icon, color, default_visible, sort_order) VALUES
('hrsa_sites', 'HRSA Sites', 'hrsa_sites', 'Health Resources and Services Administration healthcare facilities', 'hospital', '#3B82F6', true, 1),
('schools', 'PT/OT/PA Schools', 'schools', 'Physical Therapy, Occupational Therapy, and Physician Assistant programs', 'graduation-cap', '#10B981', true, 2),
('post_secondary_schools', 'Post-Secondary Schools', 'post_secondary_schools', 'All US post-secondary educational institutions', 'school', '#8B5CF6', false, 3),
('military_sites', 'Military Sites', 'military_sites', 'US military installations and bases', 'shield', '#EF4444', false, 4),
('native_american_reserves', 'Native American Reserves', 'native_american_reserves', 'Native American reservation locations', 'map-pin', '#F59E0B', false, 5);

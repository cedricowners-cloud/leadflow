-- =====================================================
-- Meta OAuth 관련 테이블
-- =====================================================

-- 1. Meta 앱 설정 테이블 (App ID, App Secret 저장)
CREATE TABLE IF NOT EXISTS meta_app_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_id VARCHAR(100) NOT NULL,
    app_secret VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 단일 레코드만 허용 (앱 설정은 하나만 있어야 함)
CREATE UNIQUE INDEX IF NOT EXISTS idx_meta_app_settings_singleton
ON meta_app_settings ((true));

COMMENT ON TABLE meta_app_settings IS 'Meta (Facebook) 앱 설정';
COMMENT ON COLUMN meta_app_settings.app_id IS 'Facebook 앱 ID';
COMMENT ON COLUMN meta_app_settings.app_secret IS 'Facebook 앱 시크릿 (암호화 권장)';


-- 2. OAuth State 테이블 (CSRF 방지용)
CREATE TABLE IF NOT EXISTS meta_oauth_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    state VARCHAR(100) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meta_oauth_states_state ON meta_oauth_states(state);
CREATE INDEX IF NOT EXISTS idx_meta_oauth_states_expires ON meta_oauth_states(expires_at);

COMMENT ON TABLE meta_oauth_states IS 'OAuth CSRF 방지용 state 저장';


-- 3. RLS 정책
ALTER TABLE meta_app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_oauth_states ENABLE ROW LEVEL SECURITY;

-- meta_app_settings: 시스템 관리자만 접근
CREATE POLICY "meta_app_settings_select" ON meta_app_settings
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM members
            WHERE members.user_id = auth.uid()
            AND members.role IN ('system_admin', 'branch_manager')
        )
    );

CREATE POLICY "meta_app_settings_insert" ON meta_app_settings
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM members
            WHERE members.user_id = auth.uid()
            AND members.role IN ('system_admin', 'branch_manager')
        )
    );

CREATE POLICY "meta_app_settings_update" ON meta_app_settings
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM members
            WHERE members.user_id = auth.uid()
            AND members.role IN ('system_admin', 'branch_manager')
        )
    );

-- meta_oauth_states: 본인 state만 접근
CREATE POLICY "meta_oauth_states_select" ON meta_oauth_states
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "meta_oauth_states_insert" ON meta_oauth_states
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "meta_oauth_states_delete" ON meta_oauth_states
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());


-- 4. 만료된 state 자동 정리 함수
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS void AS $$
BEGIN
    DELETE FROM meta_oauth_states WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_expired_oauth_states IS '만료된 OAuth state 정리';


-- 5. updated_at 트리거
CREATE TRIGGER trigger_meta_app_settings_updated_at
    BEFORE UPDATE ON meta_app_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

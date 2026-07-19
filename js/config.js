const CONFIG = {
    WEBHOOK_TEST_URL: 'https://arfinsami178.app.n8n.cloud/webhook-test/2be4a2d3-0f20-4a72-947d-98c04335b2ed',
    WEBHOOK_PROD_URL: 'https://arfinsami178.app.n8n.cloud/webhook/2be4a2d3-0f20-4a72-947d-98c04335b2ed',
    USE_TEST: true,
    VERSION: 'V-2.0',
    get WEBHOOK_URL() {
        return this.USE_TEST ? this.WEBHOOK_TEST_URL : this.WEBHOOK_PROD_URL;
    }
};

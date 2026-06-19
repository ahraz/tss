// Type declarations for Google Identity Services and Google API Client

declare namespace google {
  namespace accounts {
    namespace oauth2 {
      interface TokenClientConfig {
        client_id: string;
        scope: string;
        callback: (response: TokenResponse) => void;
      }

      interface TokenResponse {
        access_token?: string;
        expires_in?: number;
        error?: string;
      }

      interface TokenClient {
        callback: (response: TokenResponse) => void;
        requestAccessToken: (config?: { prompt?: string }) => void;
      }

      function initTokenClient(config: TokenClientConfig): TokenClient;
    }
  }
}

declare var gapi: {
  load: (api: string, callback: () => void) => void;
  client: {
    init: (config?: Record<string, unknown>) => Promise<void>;
    sheets?: unknown;
  };
};

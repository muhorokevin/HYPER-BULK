
/**
 * TACTICAL SECURE VAULT
 * Encrypts/Decrypts local storage data using a base64-xor obfuscation layer
 */
const SECRET_KEY = "HYPERBULK_01";

export const vault = {
  save: (key: string, data: any) => {
    try {
      const json = JSON.stringify(data);
      // Simple XOR-based obfuscation to "fortify" the data on-disk
      const encoded = btoa(
        json.split('').map((char, i) => 
          String.fromCharCode(char.charCodeAt(0) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length))
        ).join('')
      );
      localStorage.setItem(key, encoded);
    } catch (e) {
      console.error("VAULT_WRITE_ERROR", e);
    }
  },

  load: (key: string) => {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;
      
      const decoded = atob(stored).split('').map((char, i) => 
        String.fromCharCode(char.charCodeAt(0) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length))
      ).join('');
      
      return JSON.parse(decoded);
    } catch (e) {
      console.error("VAULT_READ_ERROR", e);
      return null;
    }
  },

  purge: () => {
    localStorage.clear();
  }
};

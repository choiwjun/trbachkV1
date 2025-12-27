/// <reference types="vite/client" />

/**
 * Service to fetch official exchange rates.
 * Switched to Frankfurter API (Open Source, No Key)
 * Endpoint: https://api.frankfurter.app/latest?from=USD&to=KRW
 */
export const fetchKCSExchangeRate = async (): Promise<number | null> => {
    try {
        // Frankfurter API (Free, No Key)
        // Direct call or via proxy if needed. Usually valid CORS.
        // Let's use direct first, if fails we add proxy.
        const url = `https://api.frankfurter.app/latest?from=USD&to=KRW`;

        const res = await fetch(url);
        if (!res.ok) {
            throw new Error(`Exchange API Error: ${res.statusText}`);
        }

        const json = await res.json();

        // Response format: { amount: 1.0, base: "USD", date: "2023-...", rates: { KRW: 1350.5 } }
        if (json && json.rates && json.rates.KRW) {
            return json.rates.KRW;
        }

        console.warn('Invalid response structure from Exchange API', json);
        return null;

    } catch (error) {
        console.error('Failed to fetch Exchange rate:', error);
        return null;
    }
};

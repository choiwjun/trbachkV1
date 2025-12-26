import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import App from './App';

describe('App', () => {
    it('renders without crashing', () => {
        render(<App />);
        // Basic check - just see if it renders something.
        // Adjust the query based on actual content of App.tsx
        // For now, we just check if it doesn't throw.
        expect(document.body).toBeInTheDocument();
    });
});

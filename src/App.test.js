import { render, screen, act } from '@testing-library/react';
import App from './App';

describe('App Component', () => {
    test('renders learn react link', async () => {
        await act(async () => {
            render(<App />);
        });
    });
});

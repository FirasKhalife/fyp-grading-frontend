import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Home from './Home'; // Adjust the import path based on your project structure
import { BrowserRouter } from 'react-router-dom';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
}));

describe('Home Component', () => {
    const mockUser = {
        isAdmin: true,
    };

    const mockReviewerTeamsAssessments = {
        reviewerAssessments: [{ id: 1, name: 'Assessment1' }],
        reviewerTeams: [
            { team: { id: 1 }, teamAssessments: [{ id: 1, name: 'Assessment1', grade: null }] },
            { team: { id: 2 }, teamAssessments: [{ id: 2, name: 'Assessment2', grade: null }] },
        ],
    };

    test('renders All Teams button for admin user', () => {
        render(
            <BrowserRouter>
                <Home user={mockUser} reviewerTeamsAssessments={mockReviewerTeamsAssessments} />
            </BrowserRouter>
        );

        const allTeamsButton = screen.getByRole('button', { name: /All Teams/i });
        expect(allTeamsButton).toBeInTheDocument();
    });

    test('renders correct number of team buttons', () => {
        render(
            <BrowserRouter>
                <Home user={mockUser} reviewerTeamsAssessments={mockReviewerTeamsAssessments} />
            </BrowserRouter>
        );

        const teamButtons = screen.getAllByText(/Team/i);
        expect(teamButtons).toHaveLength(mockReviewerTeamsAssessments.reviewerTeams.length);
    });
});

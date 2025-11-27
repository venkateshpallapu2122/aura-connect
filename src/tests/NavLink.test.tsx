import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import { NavLink } from '../components/NavLink';

describe('NavLink', () => {
  it('renders correctly with default class', () => {
    render(
      <BrowserRouter>
        <NavLink to="/test" className="default-class">Test Link</NavLink>
      </BrowserRouter>
    );

    const link = screen.getByRole('link', { name: /test link/i });
    expect(link.className).toContain('default-class');
    expect(link.getAttribute('href')).toBe('/test');
  });

  it('applies active class when active', () => {
    // Current location is default / in test environment
    render(
      <BrowserRouter>
        <NavLink to="/" className="default" activeClassName="active">Home</NavLink>
      </BrowserRouter>
    );

    const link = screen.getByRole('link', { name: /home/i });
    expect(link.className).toContain('default');
    expect(link.className).toContain('active');
  });

  it('does not apply active class when inactive', () => {
    render(
      <BrowserRouter>
        <NavLink to="/other" className="default" activeClassName="active">Other</NavLink>
      </BrowserRouter>
    );

    const link = screen.getByRole('link', { name: /other/i });
    expect(link.className).toContain('default');
    expect(link.className).not.toContain('active');
  });
});

/**
 * Tests for Home page component
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Page from '../[locale]/page';

describe('Home Page', () => {
  it('should render the homepage', () => {
    render(<Page />);

    // Verify that translations are working - our mock returns "HomePage.memorialTitle"
    expect(screen.getByText('HomePage.memorialTitle')).toBeInTheDocument();
  });

  it('should render homepage components', () => {
    render(<Page />);

    // Verify the page structure exists
    const container = document.querySelector('.container');
    expect(container).toBeInTheDocument();
  });
});

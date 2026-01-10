import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useSeasonalEffect, useSeasonalTheme } from '../index';

describe('useSeasonalTheme hooks', () => {
  it('renders a component that calls seasonal hooks without throwing', () => {
    function TestComponent() {
      useSeasonalTheme();
      useSeasonalEffect();
      return null;
    }

    expect(() => render(<TestComponent />)).not.toThrow();
  });

  it('imports the themes barrel without TDZ issues', async () => {
    await expect(import('../../index')).resolves.toBeDefined();
  });
});

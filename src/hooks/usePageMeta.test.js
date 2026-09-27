import React from 'react';
import { render } from '@testing-library/react';
import { usePageMeta } from './usePageMeta';

function Page({ meta }) {
  usePageMeta(meta);
  return null;
}

const desc = () => document.querySelector('meta[name="description"]')?.getAttribute('content');
const canonical = () => document.querySelector('link[rel="canonical"]')?.getAttribute('href');
const og = (k) => document.querySelector(`meta[property="og:${k}"]`)?.getAttribute('content');

describe('usePageMeta', () => {
  beforeEach(() => {
    document.head.innerHTML =
      '<meta name="description" content="Default description" />' +
      '<meta property="og:title" content="Default og title" />' +
      '<link rel="canonical" href="https://benchlot.com/" />';
    document.title = 'Default title';
  });

  it('writes title, description, canonical and social tags', () => {
    render(<Page meta={{ title: 'Scan title', description: 'Scan description', canonical: 'https://benchlot.com/scan' }} />);
    expect(document.title).toBe('Scan title');
    expect(desc()).toBe('Scan description');
    expect(canonical()).toBe('https://benchlot.com/scan');
    expect(og('title')).toBe('Scan title');
    expect(og('description')).toBe('Scan description');
    expect(og('url')).toBe('https://benchlot.com/scan');
  });

  it('restores the previous values on unmount and removes tags it created', () => {
    const { unmount } = render(<Page meta={{ title: 'Scan title', description: 'Scan description', canonical: 'https://benchlot.com/scan' }} />);
    unmount();
    expect(document.title).toBe('Default title');
    expect(desc()).toBe('Default description');
    expect(og('title')).toBe('Default og title');
    expect(canonical()).toBe('https://benchlot.com/');
    expect(document.querySelector('meta[property="og:url"]')).toBeNull();
    expect(document.querySelector('meta[property="og:description"]')).toBeNull();
  });

  it('leaves fields alone when they are not provided', () => {
    render(<Page meta={{ title: 'Only a title' }} />);
    expect(document.title).toBe('Only a title');
    expect(desc()).toBe('Default description');
    expect(canonical()).toBe('https://benchlot.com/');
  });
});

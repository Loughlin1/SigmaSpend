import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LedgerFilters from './LedgerFilters';

// filters.css import would fail in jsdom — stub it
vi.mock('../../../styles/filters.css', () => ({}));

const HOLIDAYS = [
  { id: 1, name: 'Paris', destination: 'France', flag: '🇫🇷' },
];

const DEFAULT_FILTERS = {
  is_income: '',
  account_id: '',
  category: '',
  holiday_id: '',
  start_date: '',
  end_date: '',
  min_amount: '',
  max_amount: '',
  sort_date: 'desc',
  q: '',
};

describe('LedgerFilters', () => {
  let onFilterChange;

  beforeEach(() => {
    vi.clearAllMocks();
    onFilterChange = vi.fn();
  });

  it('renders the search input', () => {
    render(<LedgerFilters filters={DEFAULT_FILTERS} onFilterChange={onFilterChange} accountNameMap={{}} categories={[]} />);
    expect(screen.getByPlaceholderText(/Search description/i)).toBeInTheDocument();
  });

  it('shows Filters toggle button', () => {
    render(<LedgerFilters filters={DEFAULT_FILTERS} onFilterChange={onFilterChange} accountNameMap={{}} categories={[]} />);
    expect(screen.getByRole('button', { name: /Filters/i })).toBeInTheDocument();
  });

  it('does not show filter drawer by default', () => {
    render(<LedgerFilters filters={DEFAULT_FILTERS} onFilterChange={onFilterChange} accountNameMap={{}} categories={[]} />);
    expect(screen.queryByLabelText(/Type/i)).not.toBeInTheDocument();
  });

  it('opens filter drawer when Filters button is clicked', () => {
    render(<LedgerFilters filters={DEFAULT_FILTERS} onFilterChange={onFilterChange} accountNameMap={{}} categories={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /Filters/i }));
    expect(screen.getByLabelText(/Type/i)).toBeInTheDocument();
  });

  it('does not show active count badge when no active filters', () => {
    render(<LedgerFilters filters={DEFAULT_FILTERS} onFilterChange={onFilterChange} accountNameMap={{}} categories={[]} />);
    // The badge only appears when activeCount > 0
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('shows active count badge for each non-default filter', () => {
    const filtersWithActive = { ...DEFAULT_FILTERS, is_income: true, start_date: '2024-01-01' };
    render(<LedgerFilters filters={filtersWithActive} onFilterChange={onFilterChange} accountNameMap={{}} categories={[]} />);
    // 2 active filters
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows Clear button when there are active filters', () => {
    const filtersWithActive = { ...DEFAULT_FILTERS, start_date: '2024-01-01' };
    render(<LedgerFilters filters={filtersWithActive} onFilterChange={onFilterChange} accountNameMap={{}} categories={[]} />);
    expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument();
  });

  it('calls onFilterChange with reset when Clear is clicked', () => {
    const filtersWithActive = { ...DEFAULT_FILTERS, start_date: '2024-01-01' };
    render(<LedgerFilters filters={filtersWithActive} onFilterChange={onFilterChange} accountNameMap={{}} categories={[]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onFilterChange).toHaveBeenCalledWith('reset', null);
  });

  it('debounces search input and calls onFilterChange with q', async () => {
    vi.useFakeTimers();
    render(<LedgerFilters filters={DEFAULT_FILTERS} onFilterChange={onFilterChange} accountNameMap={{}} categories={[]} />);

    fireEvent.change(screen.getByPlaceholderText(/Search description/i), { target: { value: 'coffee' } });

    vi.advanceTimersByTime(400);

    expect(onFilterChange).toHaveBeenCalledWith('q', 'coffee');
    vi.useRealTimers();
  });

  it('renders account options in the filter drawer', () => {
    const accountNameMap = { 1: 'Barclays', 2: 'Nationwide' };
    render(<LedgerFilters filters={DEFAULT_FILTERS} onFilterChange={onFilterChange} accountNameMap={accountNameMap} categories={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /Filters/i }));
    expect(screen.getByRole('option', { name: 'Barclays' })).toBeInTheDocument();
  });

  it('renders holiday filter when holidays are provided', () => {
    render(<LedgerFilters filters={DEFAULT_FILTERS} onFilterChange={onFilterChange} accountNameMap={{}} categories={[]} holidays={HOLIDAYS} />);
    fireEvent.click(screen.getByRole('button', { name: /Filters/i }));
    expect(screen.getByLabelText(/Holiday/i)).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Paris/i })).toBeInTheDocument();
  });

  it('does not render holiday filter when no holidays provided', () => {
    render(<LedgerFilters filters={DEFAULT_FILTERS} onFilterChange={onFilterChange} accountNameMap={{}} categories={[]} holidays={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /Filters/i }));
    expect(screen.queryByLabelText(/Holiday/i)).not.toBeInTheDocument();
  });

  it('calls onFilterChange when Type select changes', () => {
    render(<LedgerFilters filters={DEFAULT_FILTERS} onFilterChange={onFilterChange} accountNameMap={{}} categories={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /Filters/i }));

    fireEvent.change(screen.getByLabelText(/Type/i), { target: { value: 'true' } });
    expect(onFilterChange).toHaveBeenCalledWith('is_income', true);
  });

  it('calls onFilterChange when sort_date changes', () => {
    render(<LedgerFilters filters={DEFAULT_FILTERS} onFilterChange={onFilterChange} accountNameMap={{}} categories={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /Filters/i }));

    fireEvent.change(screen.getByLabelText(/Date Order/i), { target: { value: 'asc' } });
    expect(onFilterChange).toHaveBeenCalledWith('sort_date', 'asc');
  });
});

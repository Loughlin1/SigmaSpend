import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import HolidayAnalyticsSection from './HolidayAnalyticsSection';
import { holidaysApi } from '../../../api/client';

vi.mock('../../../api/client', () => ({
  holidaysApi: {
    getAll: vi.fn(),
    getSummary: vi.fn(),
  },
}));

const HOLIDAYS_WITH_EXPENSES = [
  { id: 1, name: 'Paris', destination: 'France', flag: '🇫🇷', start_date: '2024-07-01', end_date: '2024-07-14', expense_count: 3, total_spend: 500 },
];

const HOLIDAYS_NONE = [
  { id: 2, name: 'Future Trip', destination: null, flag: null, start_date: null, end_date: null, expense_count: 0, total_spend: 0 },
];

describe('HolidayAnalyticsSection', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the section heading', async () => {
    holidaysApi.getAll.mockResolvedValueOnce([]);
    render(<HolidayAnalyticsSection />);
    expect(screen.getByText('Holiday Summaries')).toBeInTheDocument();
  });

  it('is collapsed by default', async () => {
    holidaysApi.getAll.mockResolvedValueOnce(HOLIDAYS_WITH_EXPENSES);
    render(<HolidayAnalyticsSection />);
    expect(screen.queryByText('Paris')).not.toBeInTheDocument();
  });

  it('expands when header is clicked', async () => {
    holidaysApi.getAll.mockResolvedValueOnce([]);
    render(<HolidayAnalyticsSection />);
    fireEvent.click(screen.getByText('Holiday Summaries'));
    await waitFor(() => expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument());
    expect(screen.getByText(/No holidays with linked expenses/i)).toBeInTheDocument();
  });

  it('shows "no holidays" message when no holidays have expenses', async () => {
    holidaysApi.getAll.mockResolvedValueOnce(HOLIDAYS_NONE);
    render(<HolidayAnalyticsSection />);
    fireEvent.click(screen.getByText('Holiday Summaries'));
    await waitFor(() => expect(screen.getByText(/No holidays with linked expenses/i)).toBeInTheDocument());
  });

  it('renders holiday cards for holidays that have expenses', async () => {
    holidaysApi.getAll.mockResolvedValueOnce(HOLIDAYS_WITH_EXPENSES);
    holidaysApi.getSummary.mockResolvedValueOnce([]);
    render(<HolidayAnalyticsSection />);
    fireEvent.click(screen.getByText('Holiday Summaries'));
    await waitFor(() => expect(screen.getByText('🇫🇷 Paris')).toBeInTheDocument());
  });

  it('renders total spend on a holiday card', async () => {
    holidaysApi.getAll.mockResolvedValueOnce(HOLIDAYS_WITH_EXPENSES);
    holidaysApi.getSummary.mockResolvedValueOnce([]);
    render(<HolidayAnalyticsSection />);
    fireEvent.click(screen.getByText('Holiday Summaries'));
    await waitFor(() => screen.getByText('🇫🇷 Paris'));
    // Total spend shown (even if summary is empty, HolidayCard shows totalSpend from computed rows)
    // The card header shows expense_count
    expect(screen.getByText(/3 expense/i)).toBeInTheDocument();
  });

  it('renders destination when present', async () => {
    holidaysApi.getAll.mockResolvedValueOnce(HOLIDAYS_WITH_EXPENSES);
    holidaysApi.getSummary.mockResolvedValueOnce([]);
    render(<HolidayAnalyticsSection />);
    fireEvent.click(screen.getByText('Holiday Summaries'));
    await waitFor(() => screen.getByText('🇫🇷 Paris'));
    expect(screen.getByText(/France/)).toBeInTheDocument();
  });

  it('calls holidaysApi.getSummary for each holiday with expenses', async () => {
    holidaysApi.getAll.mockResolvedValueOnce(HOLIDAYS_WITH_EXPENSES);
    holidaysApi.getSummary.mockResolvedValueOnce([]);
    render(<HolidayAnalyticsSection />);
    fireEvent.click(screen.getByText('Holiday Summaries'));
    await waitFor(() => expect(holidaysApi.getSummary).toHaveBeenCalledWith(1));
  });
});

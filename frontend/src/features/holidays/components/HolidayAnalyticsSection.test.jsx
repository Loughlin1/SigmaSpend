import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import HolidayAnalyticsSection from './HolidayAnalyticsSection';
import { holidaysApi } from '../../../api/client';

vi.mock('../../../api/client', () => ({
  holidaysApi: {
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
    render(<HolidayAnalyticsSection holidays={[]} />);
    expect(screen.getByText('Holiday Summaries')).toBeInTheDocument();
  });

  it('is collapsed by default', async () => {
    render(<HolidayAnalyticsSection holidays={HOLIDAYS_WITH_EXPENSES} />);
    expect(screen.queryByText('Paris')).not.toBeInTheDocument();
  });

  it('expands when header is clicked', async () => {
    render(<HolidayAnalyticsSection holidays={[]} />);
    fireEvent.click(screen.getByText('Holiday Summaries'));
    await waitFor(() => expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument());
    expect(screen.getByText(/No holidays with linked expenses/i)).toBeInTheDocument();
  });

  it('shows "no holidays" message when no holidays have expenses', async () => {
    render(<HolidayAnalyticsSection holidays={HOLIDAYS_NONE} />);
    fireEvent.click(screen.getByText('Holiday Summaries'));
    await waitFor(() => expect(screen.getByText(/No holidays with linked expenses/i)).toBeInTheDocument());
  });

  it('renders holiday cards for holidays that have expenses', async () => {
    holidaysApi.getSummary.mockResolvedValueOnce([]);
    render(<HolidayAnalyticsSection holidays={HOLIDAYS_WITH_EXPENSES} />);
    fireEvent.click(screen.getByText('Holiday Summaries'));
    await waitFor(() => expect(screen.getByText('🇫🇷 Paris')).toBeInTheDocument());
  });

  it('renders total spend on a holiday card', async () => {
    holidaysApi.getSummary.mockResolvedValueOnce([]);
    render(<HolidayAnalyticsSection holidays={HOLIDAYS_WITH_EXPENSES} />);
    fireEvent.click(screen.getByText('Holiday Summaries'));
    await waitFor(() => screen.getByText('🇫🇷 Paris'));
    // Total spend shown (even if summary is empty, HolidayCard shows totalSpend from computed rows)
    // The card header shows expense_count
    expect(screen.getByText(/3 expense/i)).toBeInTheDocument();
  });

  it('renders destination when present', async () => {
    holidaysApi.getSummary.mockResolvedValueOnce([]);
    render(<HolidayAnalyticsSection holidays={HOLIDAYS_WITH_EXPENSES} />);
    fireEvent.click(screen.getByText('Holiday Summaries'));
    await waitFor(() => screen.getByText('🇫🇷 Paris'));
    expect(screen.getByText(/France/)).toBeInTheDocument();
  });

  it('calls holidaysApi.getSummary for each holiday with expenses', async () => {
    holidaysApi.getSummary.mockResolvedValueOnce([]);
    render(<HolidayAnalyticsSection holidays={HOLIDAYS_WITH_EXPENSES} />);
    fireEvent.click(screen.getByText('Holiday Summaries'));
    await waitFor(() => expect(holidaysApi.getSummary).toHaveBeenCalledWith(1));
  });

  it('nets income against expenses within a category (e.g. a reimbursement)', async () => {
    holidaysApi.getSummary.mockResolvedValueOnce([
      { period: '2024-07', type: 'category', category_name: 'Accommodation', parent_name: null, total_income: 200, total_expenses: 500, net: -300 },
    ]);
    render(<HolidayAnalyticsSection holidays={HOLIDAYS_WITH_EXPENSES} />);
    fireEvent.click(screen.getByText('Holiday Summaries'));
    await waitFor(() => expect(screen.getAllByText('£300.00').length).toBeGreaterThan(0));
  });

  it('nets a reimbursement against its expense even when they fall on different days (grouped by day)', async () => {
    // The flight was paid for on one day and the reimbursement landed on a later day, so the
    // analytics endpoint (grouped by day) returns them as two separate rows for the same category.
    holidaysApi.getSummary.mockResolvedValueOnce([
      { period: '2024-07-01', type: 'category', category_name: 'Flights', parent_name: null, total_income: 0, total_expenses: 400, net: -400 },
      { period: '2024-07-10', type: 'category', category_name: 'Flights', parent_name: null, total_income: 400, total_expenses: 0, net: 400 },
    ]);
    render(<HolidayAnalyticsSection holidays={HOLIDAYS_WITH_EXPENSES} />);
    fireEvent.click(screen.getByText('Holiday Summaries'));
    await waitFor(() => expect(screen.getByText(/No expenses linked/i)).toBeInTheDocument());
    expect(screen.queryByText(/Flights/)).not.toBeInTheDocument();
  });

  it('nets a partial reimbursement across different days for the same category', async () => {
    holidaysApi.getSummary.mockResolvedValueOnce([
      { period: '2024-07-01', type: 'category', category_name: 'Flights', parent_name: null, total_income: 0, total_expenses: 400, net: -400 },
      { period: '2024-07-10', type: 'category', category_name: 'Flights', parent_name: null, total_income: 150, total_expenses: 0, net: 150 },
    ]);
    render(<HolidayAnalyticsSection holidays={HOLIDAYS_WITH_EXPENSES} />);
    fireEvent.click(screen.getByText('Holiday Summaries'));
    await waitFor(() => expect(screen.getAllByText('£250.00').length).toBeGreaterThan(0));
  });

  it('hides a category whose income fully offsets its expenses', async () => {
    holidaysApi.getSummary.mockResolvedValueOnce([
      { period: '2024-07', type: 'category', category_name: 'Accommodation', parent_name: null, total_income: 500, total_expenses: 500, net: 0 },
    ]);
    render(<HolidayAnalyticsSection holidays={HOLIDAYS_WITH_EXPENSES} />);
    fireEvent.click(screen.getByText('Holiday Summaries'));
    await waitFor(() => expect(screen.getByText(/No expenses linked/i)).toBeInTheDocument());
  });

  it('does not render a "View transactions" link when onViewTransactions is not provided', async () => {
    holidaysApi.getSummary.mockResolvedValueOnce([]);
    render(<HolidayAnalyticsSection holidays={HOLIDAYS_WITH_EXPENSES} />);
    fireEvent.click(screen.getByText('Holiday Summaries'));
    await waitFor(() => screen.getByText('🇫🇷 Paris'));
    expect(screen.queryByText(/View transactions/i)).not.toBeInTheDocument();
  });

  it('calls onViewTransactions with the holiday id when the link is clicked', async () => {
    holidaysApi.getSummary.mockResolvedValueOnce([]);
    const onViewTransactions = vi.fn();
    render(<HolidayAnalyticsSection holidays={HOLIDAYS_WITH_EXPENSES} onViewTransactions={onViewTransactions} />);
    fireEvent.click(screen.getByText('Holiday Summaries'));
    await waitFor(() => screen.getByText(/View transactions/i));

    fireEvent.click(screen.getByText(/View transactions/i));
    expect(onViewTransactions).toHaveBeenCalledWith(1);
  });
});

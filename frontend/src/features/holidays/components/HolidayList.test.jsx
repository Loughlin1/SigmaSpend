import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import HolidayList from './HolidayList';
import { holidaysApi } from '../../../api/client';

vi.mock('../../../api/client', () => ({
  holidaysApi: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

const MOCK_HOLIDAYS = [
  { id: 1, name: 'Paris', destination: 'France', flag: '🇫🇷', start_date: '2024-07-01', end_date: '2024-07-14', expense_count: 2, total_spend: 300, notes: null },
  { id: 2, name: 'Rome', destination: 'Italy', flag: '🇮🇹', start_date: null, end_date: null, expense_count: 0, total_spend: 0, notes: 'Planned' },
];

describe('HolidayList', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the section heading', async () => {
    holidaysApi.getAll.mockResolvedValueOnce([]);
    render(<HolidayList />);
    expect(screen.getByText('Holidays & Trips')).toBeInTheDocument();
  });

  it('is collapsed by default and hides content', async () => {
    holidaysApi.getAll.mockResolvedValueOnce(MOCK_HOLIDAYS);
    render(<HolidayList />);
    expect(screen.queryByText('Paris')).not.toBeInTheDocument();
  });

  it('expands when header is clicked', async () => {
    holidaysApi.getAll.mockResolvedValueOnce(MOCK_HOLIDAYS);
    render(<HolidayList />);

    fireEvent.click(screen.getByText('Holidays & Trips'));
    await waitFor(() => expect(screen.getByText('🇫🇷 Paris')).toBeInTheDocument());
  });

  it('shows "No holidays yet" message when list is empty', async () => {
    holidaysApi.getAll.mockResolvedValueOnce([]);
    render(<HolidayList />);
    fireEvent.click(screen.getByText('Holidays & Trips'));
    await waitFor(() => expect(screen.getByText(/No holidays yet/i)).toBeInTheDocument());
  });

  it('renders all holiday names after expanding', async () => {
    holidaysApi.getAll.mockResolvedValueOnce(MOCK_HOLIDAYS);
    render(<HolidayList />);
    fireEvent.click(screen.getByText('Holidays & Trips'));
    await waitFor(() => {
      expect(screen.getByText('🇫🇷 Paris')).toBeInTheDocument();
      expect(screen.getByText('🇮🇹 Rome')).toBeInTheDocument();
    });
  });

  it('shows "Add Holiday / Trip" button after expanding', async () => {
    holidaysApi.getAll.mockResolvedValueOnce([]);
    render(<HolidayList />);
    fireEvent.click(screen.getByText('Holidays & Trips'));
    await waitFor(() => expect(screen.getByRole('button', { name: /Add Holiday/i })).toBeInTheDocument());
  });

  it('shows the holiday form when Add is clicked', async () => {
    holidaysApi.getAll.mockResolvedValueOnce([]);
    render(<HolidayList />);
    fireEvent.click(screen.getByText('Holidays & Trips'));
    await waitFor(() => screen.getByRole('button', { name: /Add Holiday/i }));

    fireEvent.click(screen.getByRole('button', { name: /Add Holiday/i }));
    expect(screen.getByPlaceholderText('Trip name *')).toBeInTheDocument();
  });

  it('hides the form when Cancel is clicked', async () => {
    holidaysApi.getAll.mockResolvedValueOnce([]);
    render(<HolidayList />);
    fireEvent.click(screen.getByText('Holidays & Trips'));
    await waitFor(() => screen.getByRole('button', { name: /Add Holiday/i }));

    fireEvent.click(screen.getByRole('button', { name: /Add Holiday/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByPlaceholderText('Trip name *')).not.toBeInTheDocument();
  });

  it('calls holidaysApi.create when form is submitted', async () => {
    holidaysApi.getAll.mockResolvedValueOnce([]);
    const newHoliday = { id: 3, name: 'Tokyo', destination: null, flag: null, expense_count: 0, total_spend: 0, notes: null };
    holidaysApi.create.mockResolvedValueOnce(newHoliday);
    render(<HolidayList />);
    fireEvent.click(screen.getByText('Holidays & Trips'));
    await waitFor(() => screen.getByRole('button', { name: /Add Holiday/i }));

    fireEvent.click(screen.getByRole('button', { name: /Add Holiday/i }));
    fireEvent.change(screen.getByPlaceholderText('Trip name *'), { target: { value: 'Tokyo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(holidaysApi.create).toHaveBeenCalledOnce());
  });

  it('shows Edit button for each holiday', async () => {
    holidaysApi.getAll.mockResolvedValueOnce(MOCK_HOLIDAYS);
    render(<HolidayList />);
    fireEvent.click(screen.getByText('Holidays & Trips'));
    await waitFor(() => screen.getByText('🇫🇷 Paris'));

    const editButtons = screen.getAllByRole('button', { name: 'Edit' });
    expect(editButtons).toHaveLength(2);
  });

  it('shows edit form when Edit is clicked', async () => {
    holidaysApi.getAll.mockResolvedValueOnce(MOCK_HOLIDAYS);
    render(<HolidayList />);
    fireEvent.click(screen.getByText('Holidays & Trips'));
    await waitFor(() => screen.getByText('🇫🇷 Paris'));

    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]);
    expect(screen.getByDisplayValue('Paris')).toBeInTheDocument();
  });

  it('shows Delete and then Confirm/Cancel on delete click', async () => {
    holidaysApi.getAll.mockResolvedValueOnce(MOCK_HOLIDAYS);
    render(<HolidayList />);
    fireEvent.click(screen.getByText('Holidays & Trips'));
    await waitFor(() => screen.getByText('🇫🇷 Paris'));

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    fireEvent.click(deleteButtons[0]);
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('calls holidaysApi.delete when Confirm is clicked', async () => {
    holidaysApi.getAll.mockResolvedValueOnce(MOCK_HOLIDAYS);
    holidaysApi.delete.mockResolvedValueOnce(undefined);
    render(<HolidayList />);
    fireEvent.click(screen.getByText('Holidays & Trips'));
    await waitFor(() => screen.getByText('🇫🇷 Paris'));

    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(holidaysApi.delete).toHaveBeenCalledWith(1));
  });
});

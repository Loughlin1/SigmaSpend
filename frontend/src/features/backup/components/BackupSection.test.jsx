import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BackupSection from './BackupSection';
import { backupApi } from '../../../api/client';

vi.mock('../../../api/client', () => ({
  backupApi: {
    list: vi.fn(),
    trigger: vi.fn(),
  },
}));

const MOCK_BACKUPS = [
  { filename: 'db_backup_20240115_020000.db', path: '/data/backups/db_backup_20240115_020000.db', size_kb: 128.4, created_at: '2024-01-15T02:00:00' },
  { filename: 'db_backup_20240114_020000.db', path: '/data/backups/db_backup_20240114_020000.db', size_kb: 126.0, created_at: '2024-01-14T02:00:00' },
];

describe('BackupSection', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the section heading', () => {
    backupApi.list.mockResolvedValueOnce([]);
    render(<BackupSection />);
    expect(screen.getByText('Database Backups')).toBeInTheDocument();
  });

  it('is collapsed by default and hides content', () => {
    backupApi.list.mockResolvedValueOnce([]);
    render(<BackupSection />);
    expect(screen.queryByRole('button', { name: /Back Up Now/i })).not.toBeInTheDocument();
  });

  it('expands when header is clicked', async () => {
    backupApi.list.mockResolvedValueOnce([]);
    render(<BackupSection />);
    fireEvent.click(screen.getByText('Database Backups'));
    await waitFor(() => expect(screen.getByRole('button', { name: /Back Up Now/i })).toBeInTheDocument());
  });

  it('shows "No backups yet" when list is empty', async () => {
    backupApi.list.mockResolvedValueOnce([]);
    render(<BackupSection />);
    fireEvent.click(screen.getByText('Database Backups'));
    await waitFor(() => expect(screen.getByText(/No backups yet/i)).toBeInTheDocument());
  });

  it('renders backup file rows when backups exist', async () => {
    backupApi.list.mockResolvedValueOnce(MOCK_BACKUPS);
    render(<BackupSection />);
    fireEvent.click(screen.getByText('Database Backups'));
    await waitFor(() => expect(screen.getByText('db_backup_20240115_020000.db')).toBeInTheDocument());
    expect(screen.getByText('db_backup_20240114_020000.db')).toBeInTheDocument();
  });

  it('marks the newest backup with a "latest" badge', async () => {
    backupApi.list.mockResolvedValueOnce(MOCK_BACKUPS);
    render(<BackupSection />);
    fireEvent.click(screen.getByText('Database Backups'));
    await waitFor(() => expect(screen.getByText('latest')).toBeInTheDocument());
  });

  it('shows size in KB', async () => {
    backupApi.list.mockResolvedValueOnce(MOCK_BACKUPS);
    render(<BackupSection />);
    fireEvent.click(screen.getByText('Database Backups'));
    await waitFor(() => expect(screen.getByText('128.4 KB')).toBeInTheDocument());
  });

  it('calls backupApi.trigger when Back Up Now is clicked', async () => {
    backupApi.list.mockResolvedValue([]);
    backupApi.trigger.mockResolvedValueOnce({ path: '/data/backups/db_backup_20240115_030000.db' });
    render(<BackupSection />);
    fireEvent.click(screen.getByText('Database Backups'));
    await waitFor(() => screen.getByRole('button', { name: /Back Up Now/i }));

    fireEvent.click(screen.getByRole('button', { name: /Back Up Now/i }));
    await waitFor(() => expect(backupApi.trigger).toHaveBeenCalledOnce());
  });

  it('shows success message with filename after backup', async () => {
    backupApi.list.mockResolvedValue([]);
    backupApi.trigger.mockResolvedValueOnce({ path: '/data/backups/db_backup_20240115_030000.db' });
    render(<BackupSection />);
    fireEvent.click(screen.getByText('Database Backups'));
    await waitFor(() => screen.getByRole('button', { name: /Back Up Now/i }));

    fireEvent.click(screen.getByRole('button', { name: /Back Up Now/i }));
    await waitFor(() => expect(screen.getByText(/Backup created/i)).toBeInTheDocument());
    expect(screen.getByText(/db_backup_20240115_030000\.db/)).toBeInTheDocument();
  });

  it('shows error message when backup trigger fails', async () => {
    backupApi.list.mockResolvedValue([]);
    backupApi.trigger.mockRejectedValueOnce(new Error('Server error'));
    render(<BackupSection />);
    fireEvent.click(screen.getByText('Database Backups'));
    await waitFor(() => screen.getByRole('button', { name: /Back Up Now/i }));

    fireEvent.click(screen.getByRole('button', { name: /Back Up Now/i }));
    await waitFor(() => expect(screen.getByText(/Backup failed/i)).toBeInTheDocument());
  });

  it('disables Back Up Now button while triggering', async () => {
    backupApi.list.mockResolvedValue([]);
    let resolve;
    backupApi.trigger.mockReturnValueOnce(new Promise(r => { resolve = r; }));
    render(<BackupSection />);
    fireEvent.click(screen.getByText('Database Backups'));
    await waitFor(() => screen.getByRole('button', { name: /Back Up Now/i }));

    fireEvent.click(screen.getByRole('button', { name: /Back Up Now/i }));
    expect(screen.getByRole('button', { name: /Creating backup/i })).toBeDisabled();

    resolve({ path: '/x/y.db' });
  });

  it('shows informational text about automatic backup schedule', async () => {
    backupApi.list.mockResolvedValueOnce([]);
    render(<BackupSection />);
    fireEvent.click(screen.getByText('Database Backups'));
    await waitFor(() => expect(screen.getByText(/Automatic daily backup/i)).toBeInTheDocument());
  });
});

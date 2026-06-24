import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmationModal from './ConfirmationModal';

const defaultProps = {
  isOpen: true,
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
};

describe('ConfirmationModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(<ConfirmationModal {...defaultProps} isOpen={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the modal when isOpen is true', () => {
    render(<ConfirmationModal {...defaultProps} />);
    expect(screen.getByText('Confirm Deletion')).toBeInTheDocument();
  });

  it('displays custom title and message', () => {
    render(
      <ConfirmationModal
        {...defaultProps}
        title="Delete Account?"
        message="This will permanently remove the account."
      />
    );
    expect(screen.getByText('Delete Account?')).toBeInTheDocument();
    expect(screen.getByText('This will permanently remove the account.')).toBeInTheDocument();
  });

  it('displays custom button labels', () => {
    render(
      <ConfirmationModal {...defaultProps} confirmText="Yes, remove" cancelText="Go back" />
    );
    expect(screen.getByRole('button', { name: 'Yes, remove' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go back' })).toBeInTheDocument();
  });

  it('calls onConfirm when the confirm button is clicked', () => {
    render(<ConfirmationModal {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(defaultProps.onConfirm).toHaveBeenCalledOnce();
  });

  it('calls onCancel when the cancel button is clicked', () => {
    render(<ConfirmationModal {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(defaultProps.onCancel).toHaveBeenCalledOnce();
  });

  it('sets body overflow to hidden while open', () => {
    render(<ConfirmationModal {...defaultProps} />);
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('restores body overflow on unmount', () => {
    const { unmount } = render(<ConfirmationModal {...defaultProps} />);
    unmount();
    expect(document.body.style.overflow).toBe('unset');
  });
});

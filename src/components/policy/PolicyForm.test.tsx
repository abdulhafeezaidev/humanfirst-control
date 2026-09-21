import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PolicyForm from './PolicyForm';

describe('PolicyForm Integration', () => {
  const mockOnSubmit = vi.fn();
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset alert mock
    vi.stubGlobal('alert', vi.fn());
  });

  it('renders default values for new policy', () => {
    render(
      <PolicyForm 
        open={true} 
        onOpenChange={mockOnOpenChange} 
        onSubmit={mockOnSubmit} 
      />
    );
    
    expect(screen.getByText('Create New Policy')).toBeInTheDocument();
    
    // Default values check
    expect(screen.getByLabelText(/Policy Name/)).toHaveValue('');
    expect(screen.getByLabelText(/Description/)).toHaveValue('');
    
    // Check radio buttons (Exam policy should be selected by default)
    const examRadio = screen.getByRole('radio', { name: /Exam Policy/i });
    expect(examRadio).toBeChecked();
    
    // Blocked categories should have 'AI Tools' checked
    const aiToolsCheckbox = screen.getByRole('checkbox', { name: /AI Tools/i });
    expect(aiToolsCheckbox).toBeChecked();
  });

  it('validates end time must be after start time', async () => {
    render(
      <PolicyForm 
        open={true} 
        onOpenChange={mockOnOpenChange} 
        onSubmit={mockOnSubmit} 
      />
    );
    
    // Set title
    fireEvent.change(screen.getByLabelText(/Policy Name/), { target: { value: 'Test' } });
    
    // Set invalid times
    const startTimeInput = screen.getByLabelText(/Start Time/);
    const endTimeInput = screen.getByLabelText(/End Time/);
    
    fireEvent.change(startTimeInput, { target: { value: '2025-01-02T10:00' } });
    fireEvent.change(endTimeInput, { target: { value: '2025-01-01T10:00' } }); // End is before start
    
    fireEvent.click(screen.getByRole('button', { name: 'Create Policy' }));
    
    expect(window.alert).toHaveBeenCalledWith('End time must be after start time');
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('validates at least one blocked category is selected', async () => {
    render(
      <PolicyForm 
        open={true} 
        onOpenChange={mockOnOpenChange} 
        onSubmit={mockOnSubmit} 
      />
    );
    
    // Set title
    fireEvent.change(screen.getByLabelText(/Policy Name/), { target: { value: 'Test' } });
    
    // Uncheck AI Tools (the default)
    const aiToolsCheckbox = screen.getByRole('checkbox', { name: /AI Tools/i });
    fireEvent.click(aiToolsCheckbox);
    
    fireEvent.click(screen.getByRole('button', { name: 'Create Policy' }));
    
    expect(window.alert).toHaveBeenCalledWith('Please select at least one blocked category');
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('submits valid form data', async () => {
    render(
      <PolicyForm 
        open={true} 
        onOpenChange={mockOnOpenChange} 
        onSubmit={mockOnSubmit} 
      />
    );
    
    fireEvent.change(screen.getByLabelText(/Policy Name/), { target: { value: 'Valid Policy' } });
    
    // Ensure valid times
    const startTimeInput = screen.getByLabelText(/Start Time/);
    const endTimeInput = screen.getByLabelText(/End Time/);
    fireEvent.change(startTimeInput, { target: { value: '2025-01-01T10:00' } });
    fireEvent.change(endTimeInput, { target: { value: '2025-01-01T12:00' } });
    
    fireEvent.click(screen.getByRole('button', { name: 'Create Policy' }));
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      const submittedData = mockOnSubmit.mock.calls[0][0];
      expect(submittedData.title).toBe('Valid Policy');
      expect(submittedData.policy_type).toBe('exam');
    });
    
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });
});

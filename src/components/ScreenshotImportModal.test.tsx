// @vitest-environment happy-dom
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ScreenshotImportModal } from './ScreenshotImportModal';

const { mockUsePortfolio, mockExtractAssets } = vi.hoisted(() => ({
  mockUsePortfolio: vi.fn(),
  mockExtractAssets: vi.fn(),
}));

vi.mock('../store/PortfolioContext', () => ({
  usePortfolio: (...args: unknown[]) => mockUsePortfolio(...args),
}));

vi.mock('../lib/screenshotImport', () => ({
  extractAssetsFromScreenshots: (...args: unknown[]) => mockExtractAssets(...args),
}));

function createMockAsset(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Test Fund',
    ticker: 'TEST',
    quantity: 100,
    price: 25.5,
    value: 2550,
    currency: 'CAD',
    country: 'Canada',
    assetClass: 'Mutual Funds',
    isin: undefined,
    notes: undefined,
    confidence: 0.92,
    warnings: [],
    ...overrides,
  };
}

function buildPortfolioMock() {
  return {
    assets: [],
    addAsset: vi.fn().mockResolvedValue(undefined),
    importAssets: vi.fn().mockResolvedValue(undefined),
    importProgress: { visible: false, current: 0, total: 0, message: '' },
  };
}

describe('ScreenshotImportModal review queue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePortfolio.mockReturnValue(buildPortfolioMock());
    mockExtractAssets.mockReset();
  });

  it('renders upload area when open and no extraction done', () => {
    render(<ScreenshotImportModal open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText('Screenshot Import')).toBeTruthy();
    expect(screen.getByText(/Drop screenshots here/)).toBeTruthy();
  });

  it('renders nothing when closed', () => {
    render(<ScreenshotImportModal open={false} onOpenChange={vi.fn()} />);
    expect(screen.queryByText('Screenshot Import')).toBeNull();
  });

  it('shows review queue with editable fields after extraction', async () => {
    render(<ScreenshotImportModal open={true} onOpenChange={vi.fn()} />);

    mockExtractAssets.mockResolvedValue({
      candidates: [createMockAsset({
        name: 'Vanguard S&P 500',
        ticker: 'VOO',
        quantity: 50,
        price: 480.12,
        currency: 'USD',
        assetClass: 'ETF',
        confidence: 0.95,
      })],
      errors: [],
    });

    const user = userEvent.setup();
    const fileInput = screen.getByLabelText('Upload screenshot files');
    await user.upload(fileInput, new File(['fake'], 'ss.png', { type: 'image/png' }));
    await user.click(screen.getByRole('button', { name: /Extract Assets/ }));

    await waitFor(() => {
      expect(screen.getByDisplayValue('Vanguard S&P 500')).toBeTruthy();
    });

    expect(screen.getByDisplayValue('VOO')).toBeTruthy();
    expect(screen.getByDisplayValue('50')).toBeTruthy();
    expect(screen.getByDisplayValue('480.12')).toBeTruthy();
    expect(screen.getByDisplayValue('USD')).toBeTruthy();
    expect(screen.getByDisplayValue('ETF')).toBeTruthy();
    expect(screen.getByText('95%')).toBeTruthy();
  });

  it('allows editing name, ticker, quantity, price, currency, and asset class', async () => {
    render(<ScreenshotImportModal open={true} onOpenChange={vi.fn()} />);

    mockExtractAssets.mockResolvedValue({
      candidates: [createMockAsset({
        name: 'Old Name',
        ticker: 'OLD',
        quantity: 10,
        price: 100,
        currency: 'CAD',
        assetClass: 'Stocks',
        confidence: 0.8,
      })],
      errors: [],
    });

    const user = userEvent.setup();
    const fileInput = screen.getByLabelText('Upload screenshot files');
    await user.upload(fileInput, new File(['fake'], 'ss.png', { type: 'image/png' }));
    await user.click(screen.getByRole('button', { name: /Extract Assets/ }));

    await waitFor(() => {
      expect(screen.getByDisplayValue('Old Name')).toBeTruthy();
    });

    const nameInput = screen.getByDisplayValue('Old Name');
    const tickerInput = screen.getByDisplayValue('OLD');
    const qtyInput = screen.getByDisplayValue('10');
    const priceInput = screen.getByDisplayValue('100');
    const currencySelect = screen.getByDisplayValue('CAD');
    const classInput = screen.getByDisplayValue('Stocks');

    await user.clear(nameInput);
    await user.type(nameInput, 'New Name');

    await user.clear(tickerInput);
    await user.type(tickerInput, 'NEW');

    await user.clear(qtyInput);
    await user.type(qtyInput, '25');

    await user.clear(priceInput);
    await user.type(priceInput, '200');

    await user.selectOptions(currencySelect, 'INR');

    await user.clear(classInput);
    await user.type(classInput, 'Bonds');

    await waitFor(() => {
      expect(screen.getByDisplayValue('New Name')).toBeTruthy();
      expect(screen.getByDisplayValue('NEW')).toBeTruthy();
      expect(screen.getByDisplayValue('25')).toBeTruthy();
      expect(screen.getByDisplayValue('200')).toBeTruthy();
      expect(screen.getByDisplayValue('INR')).toBeTruthy();
      expect(screen.getByDisplayValue('Bonds')).toBeTruthy();
    });
  });

  it('allows excluding a candidate and commit excludes it', async () => {
    const portfolioMock = buildPortfolioMock();
    const mockImportAssets = vi.fn().mockResolvedValue(undefined);
    portfolioMock.importAssets = mockImportAssets;
    mockUsePortfolio.mockReturnValue(portfolioMock);

    render(<ScreenshotImportModal open={true} onOpenChange={vi.fn()} />);

    mockExtractAssets.mockResolvedValue({
      candidates: [
        createMockAsset({ name: 'Keep Asset', ticker: 'KEEP', confidence: 0.9 }),
        createMockAsset({ name: 'Skip Asset', ticker: 'SKIP', confidence: 0.7 }),
      ],
      errors: [],
    });

    const user = userEvent.setup();
    const fileInput = screen.getByLabelText('Upload screenshot files');
    await user.upload(fileInput, new File(['fake'], 'ss.png', { type: 'image/png' }));
    await user.click(screen.getByRole('button', { name: /Extract Assets/ }));

    await waitFor(() => {
      expect(screen.getByDisplayValue('Keep Asset')).toBeTruthy();
    });

    const excludeCheckboxes = screen.getAllByRole('checkbox');
    expect(excludeCheckboxes).toHaveLength(2);

    await user.click(excludeCheckboxes[1]);

    await user.click(screen.getByRole('button', { name: /Import 1 Asset/ }));

    await waitFor(() => {
      expect(mockImportAssets).toHaveBeenCalledTimes(1);
      const imported = mockImportAssets.mock.calls[0][0];
      expect(imported).toHaveLength(1);
      expect(imported[0].name).toBe('Keep Asset');
    });
  });

  it('disables commit button when all candidates are excluded', async () => {
    render(<ScreenshotImportModal open={true} onOpenChange={vi.fn()} />);

    mockExtractAssets.mockResolvedValue({
      candidates: [createMockAsset({ name: 'Solo Asset', confidence: 0.9 })],
      errors: [],
    });

    const user = userEvent.setup();
    const fileInput = screen.getByLabelText('Upload screenshot files');
    await user.upload(fileInput, new File(['fake'], 'ss.png', { type: 'image/png' }));
    await user.click(screen.getByRole('button', { name: /Extract Assets/ }));

    await waitFor(() => {
      expect(screen.getByDisplayValue('Solo Asset')).toBeTruthy();
    });

    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);

    const commitButton = screen.getByRole('button', { name: /Import/ });
    expect((commitButton as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows approved count and excluded indicator', async () => {
    render(<ScreenshotImportModal open={true} onOpenChange={vi.fn()} />);

    mockExtractAssets.mockResolvedValue({
      candidates: [
        createMockAsset({ name: 'Asset A', confidence: 0.9 }),
        createMockAsset({ name: 'Asset B', confidence: 0.8 }),
        createMockAsset({ name: 'Asset C', confidence: 0.7 }),
      ],
      errors: [],
    });

    const user = userEvent.setup();
    const fileInput = screen.getByLabelText('Upload screenshot files');
    await user.upload(fileInput, new File(['fake'], 'ss.png', { type: 'image/png' }));
    await user.click(screen.getByRole('button', { name: /Extract Assets/ }));

    await waitFor(() => {
      expect(screen.getByDisplayValue('Asset A')).toBeTruthy();
    });

    expect(screen.getByText(/Review each candidate/)).toBeTruthy();

    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[2]);

    expect(screen.getByText(/excluded/)).toBeTruthy();
  });

  it('shows confidence and warning indicators', async () => {
    render(<ScreenshotImportModal open={true} onOpenChange={vi.fn()} />);

    mockExtractAssets.mockResolvedValue({
      candidates: [
        createMockAsset({ name: 'High Conf', confidence: 0.95, warnings: [] }),
        createMockAsset({
          name: 'Low Conf',
          ticker: undefined,
          quantity: 0,
          price: undefined,
          confidence: 0.35,
          warnings: ['Low quality extraction, values may be inaccurate'],
        }),
      ],
      errors: [],
    });

    const user = userEvent.setup();
    const fileInput = screen.getByLabelText('Upload screenshot files');
    await user.upload(fileInput, new File(['fake'], 'ss.png', { type: 'image/png' }));
    await user.click(screen.getByRole('button', { name: /Extract Assets/ }));

    await waitFor(() => {
      expect(screen.getByText('95%')).toBeTruthy();
    });

    expect(screen.getByText('35%')).toBeTruthy();
    expect(screen.getByText(/Low quality extraction/)).toBeTruthy();
  });

  it('calls onOpenChange(false) after successful commit', async () => {
    const onOpenChange = vi.fn();
    const portfolioMock = buildPortfolioMock();
    const mockImportAssets = vi.fn().mockResolvedValue(undefined);
    portfolioMock.importAssets = mockImportAssets;
    mockUsePortfolio.mockReturnValue(portfolioMock);

    render(<ScreenshotImportModal open={true} onOpenChange={onOpenChange} />);

    mockExtractAssets.mockResolvedValue({
      candidates: [createMockAsset({ name: 'Commit Test', confidence: 0.9 })],
      errors: [],
    });

    const user = userEvent.setup();
    const fileInput = screen.getByLabelText('Upload screenshot files');
    await user.upload(fileInput, new File(['fake'], 'ss.png', { type: 'image/png' }));
    await user.click(screen.getByRole('button', { name: /Extract Assets/ }));

    await waitFor(() => {
      expect(screen.getByDisplayValue('Commit Test')).toBeTruthy();
    });

    await user.click(screen.getByRole('button', { name: /Import 1 Asset/ }));

    await waitFor(() => {
      expect(mockImportAssets).toHaveBeenCalledTimes(1);
    });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('shows extraction errors from response', async () => {
    render(<ScreenshotImportModal open={true} onOpenChange={vi.fn()} />);

    mockExtractAssets.mockResolvedValue({
      candidates: [],
      errors: ['File "bad.png": Failed to parse image'],
    });

    const user = userEvent.setup();
    const fileInput = screen.getByLabelText('Upload screenshot files');
    await user.upload(fileInput, new File(['fake'], 'ss.png', { type: 'image/png' }));
    await user.click(screen.getByRole('button', { name: /Extract Assets/ }));

    await waitFor(() => {
      expect(screen.getByText(/Failed to parse image/)).toBeTruthy();
    });
  });

  it('handles extraction throwing an error', async () => {
    mockExtractAssets.mockRejectedValue(new Error('Network error'));

    render(<ScreenshotImportModal open={true} onOpenChange={vi.fn()} />);

    const user = userEvent.setup();
    const fileInput = screen.getByLabelText('Upload screenshot files');
    await user.upload(fileInput, new File(['fake'], 'ss.png', { type: 'image/png' }));
    await user.click(screen.getByRole('button', { name: /Extract Assets/ }));

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeTruthy();
    });
  });

  it('shows start over button to reset state', async () => {
    render(<ScreenshotImportModal open={true} onOpenChange={vi.fn()} />);

    mockExtractAssets.mockResolvedValue({
      candidates: [createMockAsset({ name: 'Reset Test', confidence: 0.9 })],
      errors: [],
    });

    const user = userEvent.setup();
    const fileInput = screen.getByLabelText('Upload screenshot files');
    await user.upload(fileInput, new File(['fake'], 'ss.png', { type: 'image/png' }));
    await user.click(screen.getByRole('button', { name: /Extract Assets/ }));

    await waitFor(() => {
      expect(screen.getByDisplayValue('Reset Test')).toBeTruthy();
    });

    await user.click(screen.getByRole('button', { name: /Start over/ }));

    expect(screen.queryByDisplayValue('Reset Test')).toBeNull();
    expect(screen.getByText(/Drop screenshots here/)).toBeTruthy();
  });
});

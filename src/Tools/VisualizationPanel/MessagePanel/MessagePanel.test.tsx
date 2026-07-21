import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MessagePanel from './MessagePanel';

describe('MessagePanel', () => {
  test('renders children', () => {
    render(
      <MessagePanel>
        <span>Some message</span>
      </MessagePanel>,
    );
    expect(screen.getByText('Some message')).toBeInTheDocument();
  });

  test('renders default icon when no icon prop is given', () => {
    const { container } = render(<MessagePanel>content</MessagePanel>);
    expect(container.querySelector('.fa.fa-exclamation-circle')).toBeInTheDocument();
  });

  test('renders icon matching the icon prop', () => {
    const { container } = render(<MessagePanel icon="info-circle">content</MessagePanel>);
    expect(container.querySelector('.fa.fa-info-circle')).toBeInTheDocument();
  });

  test('applies the plain variant class by default', () => {
    const { container } = render(<MessagePanel>content</MessagePanel>);
    expect(container.querySelector('.message-panel.message-panel--plain')).toBeInTheDocument();
  });

  test('applies the boxed variant class when variant="boxed"', () => {
    const { container } = render(<MessagePanel variant="boxed">content</MessagePanel>);
    expect(container.querySelector('.message-panel.message-panel--boxed')).toBeInTheDocument();
  });

  test('applies the boxed-no-header variant class and does not render a header when variant="boxed-no-header"', () => {
    const { container } = render(<MessagePanel variant="boxed-no-header">content</MessagePanel>);
    expect(container.querySelector('.message-panel.message-panel--boxed-no-header')).toBeInTheDocument();
    expect(container.querySelector('.message-panel-header')).not.toBeInTheDocument();
  });

  test('does not render a close button when onClose is not passed', () => {
    const { container } = render(<MessagePanel>content</MessagePanel>);
    expect(container.querySelector('.close-message-panel')).not.toBeInTheDocument();
  });

  test('renders a close button and calls onClose when clicked', () => {
    const onClose = jest.fn();
    const { container } = render(<MessagePanel onClose={onClose}>content</MessagePanel>);
    const closeButton = container.querySelector('.close-message-panel')!;
    expect(closeButton).toBeInTheDocument();

    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

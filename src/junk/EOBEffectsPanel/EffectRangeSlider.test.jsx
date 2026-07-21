import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import EffectRangeSlider from './EffectRangeSlider';

const DEFAULT_PROPS = {
  name: 'Red',
  min: 0,
  max: 100,
  step: 1,
  value: [10, 90],
  onChange: jest.fn(),
};

describe('EffectRangeSlider', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('mounts without throwing and renders the slider name', () => {
    expect(() => render(<EffectRangeSlider {...DEFAULT_PROPS} />)).not.toThrow();
    expect(screen.getByText('Red')).toBeInTheDocument();
  });

  it('renders two number inputs and the slider handles reflecting the initial value', () => {
    render(<EffectRangeSlider {...DEFAULT_PROPS} />);

    const leftInput = document.querySelector('.left-value');
    const rightInput = document.querySelector('.right-value');

    expect(leftInput).toHaveValue(10);
    expect(rightInput).toHaveValue(90);
    expect(screen.getAllByRole('slider')).toHaveLength(2);
  });

  it('calls onChange with a clamped [min, max] when the left number input changes', () => {
    const onChange = jest.fn();
    render(<EffectRangeSlider {...DEFAULT_PROPS} onChange={onChange} />);

    const leftInput = document.querySelector('.left-value');
    fireEvent.change(leftInput, { target: { value: '50' } });

    expect(onChange).toHaveBeenCalledWith([50, 90]);
  });

  it('caps the left number input to the current right value when it would cross the range', () => {
    const onChange = jest.fn();
    render(<EffectRangeSlider {...DEFAULT_PROPS} onChange={onChange} />);

    const leftInput = document.querySelector('.left-value');
    fireEvent.change(leftInput, { target: { value: '150' } });

    // capValue clamps to max (100), but that would cross range.max (90), so it falls back to 90
    expect(onChange).toHaveBeenCalledWith([90, 90]);
  });

  it('calls onChange with a clamped [min, max] when the right number input changes', () => {
    const onChange = jest.fn();
    render(<EffectRangeSlider {...DEFAULT_PROPS} onChange={onChange} />);

    const rightInput = document.querySelector('.right-value');
    fireEvent.change(rightInput, { target: { value: '40' } });

    expect(onChange).toHaveBeenCalledWith([10, 40]);
  });

  it('caps the right number input to the current left value when it would cross the range', () => {
    const onChange = jest.fn();
    render(<EffectRangeSlider {...DEFAULT_PROPS} onChange={onChange} />);

    const rightInput = document.querySelector('.right-value');
    fireEvent.change(rightInput, { target: { value: '-10' } });

    // capValue clamps to min (0), but that would cross range.min (10), so it falls back to 10
    expect(onChange).toHaveBeenCalledWith([10, 10]);
  });

  it('calls onChange with the updated range once a keyboard drag on the slider completes', () => {
    const onChange = jest.fn();
    render(<EffectRangeSlider {...DEFAULT_PROPS} onChange={onChange} />);

    const handles = screen.getAllByRole('slider');
    const minHandle = handles[0];

    fireEvent.focus(minHandle);
    fireEvent.keyDown(minHandle, { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39, which: 39 });

    // onChange isn't called during the drag itself, only once it completes
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.keyUp(minHandle, { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39, which: 39 });

    expect(onChange).toHaveBeenCalledWith([11, 90]);
  });
});

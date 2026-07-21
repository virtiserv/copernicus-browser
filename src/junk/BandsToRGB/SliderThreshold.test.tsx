import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SliderThreshold } from './SliderThreshold';
import { pickColor } from './utils';
import { SliderThresholdProps } from './types';

const DEFAULT_PROPS: SliderThresholdProps = {
  values: [0, 128, 255],
  colors: [pickColor('#000000', '#ffffff', 0, 0, 255), pickColor('#000000', '#ffffff', 128, 0, 255)],
  domain: [0, 255],
  gradient: ['#000000', '#ffffff'],
  invalidMinMax: () => false,
  handlePositions: [0, 128, 255],
  onSliderUpdate: jest.fn(),
  onSliderChange: jest.fn(),
};

describe('SliderThreshold', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('mounts without throwing', () => {
    expect(() => render(<SliderThreshold {...DEFAULT_PROPS} />)).not.toThrow();
  });

  it('renders a keyboard handle for every handle position', () => {
    render(<SliderThreshold {...DEFAULT_PROPS} />);

    expect(screen.getAllByRole('slider')).toHaveLength(DEFAULT_PROPS.handlePositions.length);
    expect(document.querySelectorAll('.slider-keyboard-handle')).toHaveLength(
      DEFAULT_PROPS.handlePositions.length,
    );
  });

  it('renders the ramp value inside each handle', () => {
    render(<SliderThreshold {...DEFAULT_PROPS} />);

    DEFAULT_PROPS.values.forEach((value) => {
      expect(screen.getByText(String(value))).toBeInTheDocument();
    });
  });

  it('renders hidden span handles instead of KeyboardHandle when invalidMinMax() is true', () => {
    render(<SliderThreshold {...DEFAULT_PROPS} invalidMinMax={() => true} />);

    expect(document.querySelectorAll('.slider-keyboard-handle')).toHaveLength(0);
    expect(screen.queryAllByRole('slider')).toHaveLength(0);

    const hiddenHandles = document.querySelectorAll('.slider span');
    expect(hiddenHandles).toHaveLength(DEFAULT_PROPS.handlePositions.length);
    hiddenHandles.forEach((handle) => {
      expect(handle).toHaveStyle({ display: 'none' });
    });
  });

  it('renders a transparent placeholder when domain values are not numeric', () => {
    render(<SliderThreshold {...DEFAULT_PROPS} domain={['not-a-number', '255']} />);

    expect(document.querySelector('.slider-transparent-background')).toBeInTheDocument();
    expect(document.querySelector('.slider')).not.toBeInTheDocument();
  });

  it('fires onSliderUpdate and onSliderChange when a handle is moved with the keyboard', () => {
    const onSliderUpdate = jest.fn();
    const onSliderChange = jest.fn();

    render(
      <SliderThreshold {...DEFAULT_PROPS} onSliderUpdate={onSliderUpdate} onSliderChange={onSliderChange} />,
    );

    const handles = screen.getAllByRole('slider');
    const middleHandle = handles[1];

    fireEvent.focus(middleHandle);
    fireEvent.keyDown(middleHandle, { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39, which: 39 });

    expect(onSliderUpdate).toHaveBeenCalledTimes(1);
    expect(onSliderUpdate).toHaveBeenCalledWith([0, 128.01, 255]);

    fireEvent.keyUp(middleHandle, { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39, which: 39 });

    expect(onSliderChange).toHaveBeenCalledTimes(1);
  });
});

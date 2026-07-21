import React, { cloneElement, ReactElement } from 'react';

interface KeyboardHandleProps {
  origin: ReactElement<React.HTMLAttributes<HTMLDivElement>>;
  pointingToColor?: string;
  rampValue: number;
}

export function KeyboardHandle({ origin, pointingToColor, rampValue }: KeyboardHandleProps) {
  return cloneElement(
    origin,
    {
      className: 'slider-keyboard-handle',
      style: {
        ...origin.props.style,
        position: 'absolute',
        zIndex: 2,
        marginTop: -9,
        width: 20,
        height: 20,
        cursor: 'pointer',
        borderRadius: '50%',
        border: '2px solid white',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
        backgroundColor: pointingToColor,
      },
    },
    <div
      style={{
        position: 'relative',
        height: 0,
        marginTop: 16,
        marginBottom: 8,
        width: 0,
        marginLeft: 2,
        borderLeft: '6px solid transparent',
        borderRight: '6px solid transparent',
        borderTop: '10px solid white',
        pointerEvents: 'none',
      }}
    />,
    <div className="handle-value" style={{ pointerEvents: 'none' }}>
      {rampValue}
    </div>,
  );
}

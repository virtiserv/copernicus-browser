import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';

import store, { externalLayersSlice } from '../store';
import ExternalWmsLayerContainer from './ExternalWmsLayerContainer';

// The per-page dropdown (react-select) doesn't render meaningfully in jsdom and isn't under test.
jest.mock('react-select', () => () => null);

const SERVER = {
  id: 'test-server',
  name: 'Test Server',
  url: 'https://example.com/wms',
  type: 'WMS' as const,
  layers: [
    {
      id: 'layer1',
      name: 'layer1',
      title: 'Layer One',
      // metadataUrls reach the component already filtered to human-viewable web pages at parse time
      // (raw XML/data documents are dropped via isWebPageMetadata; see externalLayers.utils.test.ts).
      // The component only decides link-vs-plain-text by URL scheme.
      metadataUrls: [
        'https://www.geocat.ch/geonetwork/srv/ger/catalog.search#/metadata/e986a2d2', // web page -> link
        'javascript:alert(1)', // non-http scheme -> plain text, never a link
      ],
      attribution: 'https://provider.example.com/attribution',
    },
    {
      id: 'layer2',
      name: 'layer2',
      title: 'Layer Two',
      attribution: 'Plain Text Provider',
    },
  ],
};

const renderContainer = () =>
  render(
    <Provider store={store}>
      <ExternalWmsLayerContainer />
    </Provider>,
  );

describe('ExternalWmsLayerContainer metadata/attribution link rendering', () => {
  beforeEach(() => {
    act(() => {
      store.dispatch(externalLayersSlice.actions.addExternalServer(SERVER));
    });
  });

  afterEach(() => {
    act(() => {
      store.dispatch(externalLayersSlice.actions.removeExternalServer(SERVER.id));
    });
  });

  it('renders a web-page metadata URL as a link', () => {
    renderContainer();

    const link = screen.getByText('Metadata 1');
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute(
      'href',
      'https://www.geocat.ch/geonetwork/srv/ger/catalog.search#/metadata/e986a2d2',
    );
  });

  it('renders a non-http metadata URL as plain text', () => {
    renderContainer();

    const notLink = screen.getByText('Metadata 2');
    expect(notLink.tagName).not.toBe('A');
    expect(notLink).not.toHaveAttribute('href');
  });

  it('renders a URL attribution as a link labelled with its hostname, full URL in the tooltip', () => {
    renderContainer();

    const link = screen.getByText('provider.example.com');
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', 'https://provider.example.com/attribution');
    expect(link).toHaveAttribute('title', 'https://provider.example.com/attribution');
  });

  it('renders a non-URL attribution as plain text', () => {
    renderContainer();

    const notLink = screen.getByText('Plain Text Provider');
    expect(notLink.tagName).not.toBe('A');
  });
});

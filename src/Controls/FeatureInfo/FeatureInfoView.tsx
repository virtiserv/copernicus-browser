import React from 'react';
import { t } from 'ttag';
import { DraggableDialogBox } from '../../components/DraggableDialogBox/DraggableDialogBox';
import { ExternalFeatureInfoResult } from './FeatureInfo.utils';
import './FeatureInfo.scss';

type AttributeValue = string | number | null | undefined;

// Appended after the server's GetFeatureInfo HTML inside the sandboxed iframe so the table
// matches the app (full width, app fonts/borders). Placed last so it wins the CSS cascade.
const FEATURE_INFO_HTML_STYLE = `
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #222; padding: 8px; }
  table, table.featureInfo { border-collapse: collapse; }
  table td, table th, table.featureInfo td, table.featureInfo th {
    border: 1px solid #e5e7eb; padding: 6px 10px; text-align: left; font-size: 13px; white-space: nowrap;
  }
  table th, table.featureInfo th { background: #f5f7fa; color: #555; font-weight: 600; }
</style>`;

const defaultGetLabel = (key: string): string => key;
const defaultGetValue = (_key: string, value: AttributeValue): string =>
  value === '' || value === null || value === undefined ? '—' : String(value);

type Props = {
  title: string;
  loading: boolean;
  error: string | null;
  result: ExternalFeatureInfoResult;
  onClose: () => void;
  // Override how attribute rows are labelled/formatted (CLMS uses curated labels; WMS shows raw).
  getLabel?: (key: string) => string;
  getValue?: (key: string, value: AttributeValue) => string;
  width?: number;
  height?: number;
};

// Shared presentation for both CLMS and external WMS feature info: a draggable dialog that
// renders a spinner, error, "no feature", an attributes table, sandboxed HTML, or plain text.
export const FeatureInfoView = ({
  title,
  loading,
  error,
  result,
  onClose,
  getLabel = defaultGetLabel,
  getValue = defaultGetValue,
  width = 520,
  height = 400,
}: Props) => {
  const renderContent = () => {
    if (loading) {
      return (
        <div className="feature-info-status">
          <i className="fa fa-spinner fa-spin fa-fw" />
        </div>
      );
    }
    if (error) {
      return <div className="feature-info-status feature-info-error">{error}</div>;
    }
    if (!result) {
      return <div className="feature-info-status">{t`No feature at this location.`}</div>;
    }
    if (result.kind === 'html') {
      // Sandboxed iframe (no scripts/forms) so untrusted server HTML can't run code.
      // Trade-off: sandbox="" also blocks external images/CSS, so HTML that depends on
      // externally-hosted resources renders unstyled — acceptable vs. the security risk
      // of allow-same-origin on untrusted content.
      // Inject the style inside <body> when the server returns a full document, otherwise append
      // it (servers that return a bare fragment have no </body> to target).
      const styledHtml = /<\/body>/i.test(result.html)
        ? result.html.replace(/<\/body>/i, `${FEATURE_INFO_HTML_STYLE}</body>`)
        : `${result.html}${FEATURE_INFO_HTML_STYLE}`;
      return <iframe className="feature-info-html" sandbox="" srcDoc={styledHtml} title={title} />;
    }
    if (result.kind === 'text') {
      return <pre className="feature-info-text">{result.text}</pre>;
    }
    const rows = Object.entries(result.attributes).map(([key, value]) => ({
      key,
      label: getLabel(key),
      formatted: getValue(key, value),
    }));

    return (
      <table className="feature-info-table">
        <tbody>
          {rows.map(({ key, label, formatted }) => (
            <tr key={key}>
              <th>{label}</th>
              <td>{formatted}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <DraggableDialogBox
      className="feature-info-dialog"
      title={title}
      width={width}
      height={height}
      onClose={onClose}
      modal={true}
    >
      <div className="feature-info-content">{renderContent()}</div>
    </DraggableDialogBox>
  );
};

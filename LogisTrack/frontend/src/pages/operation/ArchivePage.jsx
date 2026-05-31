import { useEffect, useState } from "react";

import PageHeader from "../../components/PageHeader";
import TableWrap from "../../components/TableWrap";
import { SearchBar } from "../../components/SearchBar";
import { useAuth } from "../../context/AuthContext";
import { formatCurrency, formatDate, formatDateTime, formatNumber } from "../../lib/formatters";

function ArchivePage() {
  const { authRequest, downloadRequest } = useAuth();
  const [trips, setTrips] = useState([]);
  const [filteredTrips, setFilteredTrips] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const displayTrips = filteredTrips !== null ? filteredTrips : trips;

  const loadTrips = async () => {
    setError("");
    if (!navigator.onLine) {
      setError("Offline mod — cached veriler gösteriliyor.");
      setIsLoading(false);
      return;
    }
    try {
      const response = await authRequest("/trips/");
      setTrips(response || []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTrips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onExport = async () => {
    try {
      await downloadRequest("/archive/export/", "fleet-archive.xlsx");
    } catch (downloadError) {
      setError(downloadError.message);
    }
  };

  const onExportEmail = async () => {
    try {
      const response = await authRequest("/archive/export/", { method: "POST" });
      alert(response.message || "Export request received. Check your email shortly.");
    } catch (exportError) {
      setError(exportError.message);
    }
  };

  const onExportPDF = async () => {
    try {
      const response = await authRequest("/archive/export/pdf/", { method: "POST" });
      alert(response.message || "PDF export request received. Check your email shortly.");
    } catch (exportError) {
      setError(exportError.message);
    }
  };

  return (
    <section className="page-section">
      <PageHeader
        title="Trip archive"
        subtitle="All records in fleet."
        actions={
          <>
            <button type="button" className="ghost-button" onClick={loadTrips}>
              Refresh list
            </button>
            <button type="button" className="danger-button" onClick={onExport}>
              Download Excel
            </button>
            <button type="button" className="ghost-button" onClick={onExportEmail}>
              Export via e-mail
            </button>
            <button type="button" className="ghost-button" onClick={onExportPDF}>
              Send as PDF via e-mail
            </button>
          </>
        }
      />

      {error ? <p className="form-error">{error}</p> : null}
      {isLoading ? <p>Loading records</p> : null}

      <SearchBar
        onResults={(results) => setFilteredTrips(results)}
        onClear={() => setFilteredTrips(null)}
      />

      {filteredTrips !== null && (
        <p style={{ fontSize: "13px", color: "#666", marginBottom: "8px" }}>
          {filteredTrips.length} result{filteredTrips.length !== 1 ? "s" : ""} found
        </p>
      )}

      <TableWrap>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Plate</th>
              <th>Route</th>
              <th>Customer</th>
              <th>Total KM</th>
              <th>Amount</th>
              <th>Receipt</th>
            </tr>
          </thead>
          <tbody>
            {displayTrips.map((trip) => (
              <tr key={trip.id}>
                <td>{formatDateTime(trip.created_at)}</td>
                <td>{trip.plate_number}</td>
                <td>
                  {trip.origin} - {trip.destination}
                </td>
                <td>{trip.customer || "-"}</td>
                <td>{formatNumber(trip.total_km, 2)} km</td>
                <td>{formatCurrency(trip.total_amount)}</td>
                <td>
                  {trip.invoice_no || "-"}
                  <br />
                  <span className="muted-text">{formatDate(trip.invoice_date)}</span>
                </td>
              </tr>
            ))}
            {!displayTrips.length && !isLoading ? (
              <tr>
                <td colSpan={7} className="empty-row">
                  {filteredTrips !== null ? "No results found." : "Archive could not be found."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </TableWrap>
    </section>
  );
}

export default ArchivePage;
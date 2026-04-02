import { useEffect, useState } from "react";

import PageHeader from "../../components/PageHeader";
import TableWrap from "../../components/TableWrap";
import { useAuth } from "../../context/AuthContext";
import { formatCurrency, formatDate, formatDateTime, formatNumber } from "../../lib/formatters";

function ArchivePage() {
  const { authRequest, downloadRequest } = useAuth();
  const [trips, setTrips] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTrips = async () => {
    setError("");
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

  return (
    <section className="page-section">
      <PageHeader
        title="Sefer Arsivi"
        subtitle="Filo yonetiminden girilen tum sefer kayitlari."
        actions={
          <>
            <button type="button" className="ghost-button" onClick={loadTrips}>
              Listeyi Yenile
            </button>
            <button type="button" className="danger-button" onClick={onExport}>
              Excel Aktar
            </button>
          </>
        }
      />

      {error ? <p className="form-error">{error}</p> : null}
      {isLoading ? <p>Kayitlar yukleniyor...</p> : null}

      <TableWrap>
        <table>
          <thead>
            <tr>
              <th>Tarih</th>
              <th>Plaka</th>
              <th>Rota</th>
              <th>Musteri</th>
              <th>Toplam KM</th>
              <th>Tutar</th>
              <th>Fatura</th>
            </tr>
          </thead>
          <tbody>
            {trips.map((trip) => (
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
            {!trips.length && !isLoading ? (
              <tr>
                <td colSpan={7} className="empty-row">
                  Arsivde kayit bulunamadi.
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

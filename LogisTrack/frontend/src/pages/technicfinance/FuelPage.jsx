import { useEffect, useState } from "react";

import PageHeader from "../../components/PageHeader";
import TableWrap from "../../components/TableWrap";
import { useAuth } from "../../context/AuthContext";
import { formatCurrency, formatDate } from "../../lib/formatters";

const initialForm = {
  vehicle: "",
  date: "",
  liters: "",
  amount: "",
  notes: "",
};

function FuelPage() {
  const { authRequest } = useAuth();
  const [entryType, setEntryType] = useState("fuel");
  const [vehicles, setVehicles] = useState([]);
  const [mergedRows, setMergedRows] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

   //added new.
  const loadData = async () => {
    setError("");
    try {
      const [vehicleResponse, mergedResponse] = await Promise.all([
        authRequest("/vehicles/"),
        authRequest("/fuel-entries/merged/"),
      ]);
      setVehicles(vehicleResponse || []);
      setMergedRows(mergedResponse || []);
      if (!form.vehicle && vehicleResponse?.length) {
        setForm((prev) => ({ ...prev, vehicle: String(vehicleResponse[0].id) }));
      }
    } catch (loadError) {
      setError(loadError.message);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

 const onChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

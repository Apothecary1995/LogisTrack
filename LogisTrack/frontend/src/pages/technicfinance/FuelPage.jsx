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

  //I will add remain part later on.
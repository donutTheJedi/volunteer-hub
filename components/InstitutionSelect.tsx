"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useTranslations } from "next-intl";

interface Institution {
  id: string;
  name: string;
}

interface InstitutionSelectProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  allowAddNew?: boolean;
}

export default function InstitutionSelect({ label, placeholder, value, onChange, required, allowAddNew = true }: InstitutionSelectProps) {
  const t = useTranslations();
  const [query, setQuery] = useState<string>("");
  const [options, setOptions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [adding, setAdding] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [isOpen, setIsOpen] = useState<boolean>(false);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  async function loadOptions(searchText: string) {
    setLoading(true);
    setError("");
    const ilikePattern = searchText ? `%${searchText}%` : "%";
    const { data, error } = await supabase
      .from("institutions")
      .select("id, name")
      .ilike("name", ilikePattern)
      .order("name")
      .limit(20);
    if (error) {
      setError(error.message);
      setOptions([]);
    } else {
      setOptions(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    let isCurrent = true;
    if (isOpen) {
      loadOptions((query || "").trim());
    }
    return () => {
      isCurrent = false;
    };
  }, [query, isOpen]);

  useEffect(() => {
    // Preload some options on mount for better UX
    loadOptions("");
  }, []);

  const showAddNew = useMemo(() => {
    const input = (query || "").trim();
    if (!input) return false;
    const exists = options.some(o => o.name.toLowerCase() === input.toLowerCase());
    return allowAddNew && !exists;
  }, [options, query, allowAddNew]);

  async function handleAddNew() {
    const name = (query || "").trim();
    if (!name) return;
    setAdding(true);
    setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Please sign in to add an institution');
      setAdding(false);
      return;
    }
    const { error } = await supabase.from("institutions").insert({ name, created_by: user.id });
    if (error && error.code !== "23505") { // ignore unique violation race
      setError(error.message);
      setAdding(false);
      return;
    }
    onChange(name);
    setAdding(false);
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      <div className="relative">
        <input
          className="border border-gray-300 dark:border-gray-600 p-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            const val = e.target.value;
            setQuery(val);
            onChange(val);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
          required={required}
        />
        <button
          type="button"
          aria-label="toggle institutions"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setIsOpen((v) => !v)}
        >
          ▾
        </button>
        {isOpen && ((options && options.length > 0) || showAddNew || loading) && (
          <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
            {loading && (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">{t('institutions.loading')}</div>
            )}
            {!loading && options.length === 0 && !showAddNew && (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">{t('institutions.noResults')}</div>
            )}
            {!loading && options.map(opt => (
              <button
                type="button"
                key={opt.id}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100"
                onClick={() => {
                  onChange(opt.name);
                  setQuery(opt.name);
                  setIsOpen(false);
                }}
              >
                {opt.name}
              </button>
            ))}
            {!loading && showAddNew && (
              <div className="border-t border-gray-200 dark:border-gray-600" />
            )}
            {!loading && showAddNew && (
              <button
                type="button"
                className="w-full text-left px-3 py-2 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
                onClick={handleAddNew}
                disabled={adding}
              >
                {adding ? t('institutions.adding') : `+ ${t('common.add')} "${(query || "").trim()}"`}
              </button>
            )}
          </div>
        )}
      </div>
      {error && <div className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</div>}
    </div>
  );
}



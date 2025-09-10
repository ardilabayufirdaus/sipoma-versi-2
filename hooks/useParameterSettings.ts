import { useState, useCallback, useEffect } from "react";
import { ParameterSetting } from "../types";
import { supabase } from "../utils/supabase";

export const useParameterSettings = () => {
  const [records, setRecords] = useState<ParameterSetting[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("parameter_settings")
      .select("*")
      .order("parameter");

    if (error) {
      console.error("Error fetching parameter settings:", error);
      setRecords([]);
    } else {
      setRecords((data || []) as any[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const addRecord = useCallback(
    async (record: Omit<ParameterSetting, "id">) => {
      const { error } = await supabase
        .from("parameter_settings")
        .insert([record as any]);
      if (error) console.error("Error adding parameter setting:", error);
      else fetchRecords();
    },
    [fetchRecords]
  );

  const updateRecord = useCallback(
    async (updatedRecord: ParameterSetting) => {
      const { id, ...updateData } = updatedRecord;
      const { error } = await supabase
        .from("parameter_settings")
        .update(updateData as any)
        .eq("id", id);
      if (error) console.error("Error updating parameter setting:", error);
      else fetchRecords();
    },
    [fetchRecords]
  );

  const deleteRecord = useCallback(
    async (recordId: string) => {
      const { error } = await supabase
        .from("parameter_settings")
        .delete()
        .eq("id", recordId);
      if (error) console.error("Error deleting parameter setting:", error);
      else fetchRecords();
    },
    [fetchRecords]
  );

  const setAllRecords = useCallback(
    async (newRecords: Omit<ParameterSetting, "id">[]) => {
      try {
        // Use upsert approach to avoid race condition
        // First, get all existing records to compare
        const { data: existingRecords, error: fetchError } = await supabase
          .from("parameter_settings")
          .select("*");

        if (fetchError) {
          console.error(
            "Error fetching existing parameter settings:",
            fetchError
          );
          throw new Error("Failed to fetch existing records");
        }

        // Only proceed if we have new records to insert
        if (newRecords.length > 0) {
          // Insert new records first
          const { error: insertError } = await supabase
            .from("parameter_settings")
            .insert(newRecords as any[]);

          if (insertError) {
            console.error(
              "Error bulk inserting parameter settings:",
              insertError
            );
            throw new Error("Failed to insert new records");
          }

          // Only delete old records after successful insert
          if (existingRecords && existingRecords.length > 0) {
            const { error: deleteError } = await supabase
              .from("parameter_settings")
              .delete()
              .in(
                "id",
                existingRecords.map((r) => r.id)
              );

            if (deleteError) {
              console.error("Error clearing old parameter settings:", deleteError);
              // Don't throw here as new data is already saved
            }
          }
        } else {
          // If no new records, just clear existing ones
          if (existingRecords && existingRecords.length > 0) {
            const { error: deleteError } = await supabase
              .from("parameter_settings")
              .delete()
              .in(
                "id",
                existingRecords.map((r) => r.id)
              );

            if (deleteError) {
              console.error("Error clearing parameter settings:", deleteError);
              throw new Error("Failed to clear existing records");
            }
          }
        }

        // Refresh the data
        fetchRecords();
      } catch (error) {
        console.error("Error in setAllRecords:", error);
        // Re-fetch to ensure UI is in sync with database
        fetchRecords();
        throw error;
      }
    },
    [fetchRecords]
  );

  return {
    records,
    loading,
    addRecord,
    updateRecord,
    deleteRecord,
    setAllRecords,
  };
};

import { useState, useCallback, useEffect } from "react";
import { PlantUnit } from "../types";
import { supabase } from "../utils/supabase";

export const usePlantUnits = () => {
  const [records, setRecords] = useState<PlantUnit[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("plant_units")
      .select("*")
      .order("category")
      .order("unit");

    if (error) {
      console.error("Error fetching plant units:", error);
      setRecords([]);
    } else {
      setRecords(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const addRecord = useCallback(
    async (record: Omit<PlantUnit, "id">) => {
      const { error } = await supabase.from("plant_units").insert([record]);
      if (error) console.error("Error adding plant unit:", error);
      else fetchRecords();
    },
    [fetchRecords]
  );

  const updateRecord = useCallback(
    async (updatedRecord: PlantUnit) => {
      const { id, ...updateData } = updatedRecord;
      const { error } = await supabase
        .from("plant_units")
        .update(updateData)
        .eq("id", id);
      if (error) console.error("Error updating plant unit:", error);
      else fetchRecords();
    },
    [fetchRecords]
  );

  const deleteRecord = useCallback(
    async (recordId: string) => {
      const { error } = await supabase
        .from("plant_units")
        .delete()
        .eq("id", recordId);
      if (error) console.error("Error deleting plant unit:", error);
      else fetchRecords();
    },
    [fetchRecords]
  );

  const setAllRecords = useCallback(
    async (newRecords: Omit<PlantUnit, "id">[]) => {
      try {
        // Use upsert approach to avoid race condition
        // First, get all existing records to compare
        const { data: existingRecords, error: fetchError } = await supabase
          .from("plant_units")
          .select("*");

        if (fetchError) {
          console.error("Error fetching existing plant units:", fetchError);
          throw new Error("Failed to fetch existing records");
        }

        // Only proceed if we have new records to insert
        if (newRecords.length > 0) {
          // Insert new records first
          const { error: insertError } = await supabase
            .from("plant_units")
            .insert(newRecords);

          if (insertError) {
            console.error("Error bulk inserting plant units:", insertError);
            throw new Error("Failed to insert new records");
          }

          // Only delete old records after successful insert
          if (existingRecords && existingRecords.length > 0) {
            const { error: deleteError } = await supabase
              .from("plant_units")
              .delete()
              .in(
                "id",
                existingRecords.map((r) => r.id)
              );

            if (deleteError) {
              console.error("Error clearing old plant units:", deleteError);
              // Don't throw here as new data is already saved
            }
          }
        } else {
          // If no new records, just clear existing ones
          if (existingRecords && existingRecords.length > 0) {
            const { error: deleteError } = await supabase
              .from("plant_units")
              .delete()
              .in(
                "id",
                existingRecords.map((r) => r.id)
              );

            if (deleteError) {
              console.error("Error clearing plant units:", deleteError);
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
    addRecord,
    updateRecord,
    deleteRecord,
    setAllRecords,
    loading,
  };
};

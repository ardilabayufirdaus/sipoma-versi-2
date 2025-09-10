import { useState, useCallback, useEffect } from 'react';
import { SiloCapacity } from '../types';
import { supabase } from '../utils/supabase';

export const useSiloCapacities = () => {
  const [records, setRecords] = useState<SiloCapacity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('silo_capacities')
      .select('*')
      .order('silo_name');
      
    if (error) {
      console.error('Error fetching silo capacities:', error);
      setRecords([]);
    } else {
      setRecords((data || []) as any[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const addRecord = useCallback(async (record: Omit<SiloCapacity, 'id'>) => {
    const { error } = await supabase.from('silo_capacities').insert([record]);
    if (error) console.error('Error adding silo capacity:', error);
    else fetchRecords();
  }, [fetchRecords]);

  const updateRecord = useCallback(async (updatedRecord: SiloCapacity) => {
    const { id, ...updateData } = updatedRecord;
    const { error } = await supabase.from('silo_capacities').update(updateData).eq('id', id);
    if (error) console.error('Error updating silo capacity:', error);
    else fetchRecords();
  }, [fetchRecords]);

  const deleteRecord = useCallback(async (recordId: string) => {
    const { error } = await supabase.from('silo_capacities').delete().eq('id', recordId);
    if (error) console.error('Error deleting silo capacity:', error);
    else fetchRecords();
  }, [fetchRecords]);
  
  const setAllRecords = useCallback(async (newRecords: Omit<SiloCapacity, 'id'>[]) => {
    try {
      // Use upsert approach to avoid race condition
      // First, get all existing records to compare
      const { data: existingRecords, error: fetchError } = await supabase
        .from('silo_capacities')
        .select('*');

      if (fetchError) {
        console.error('Error fetching existing silo capacities:', fetchError);
        throw new Error('Failed to fetch existing records');
      }

      // Only proceed if we have new records to insert
      if (newRecords.length > 0) {
        // Insert new records first
        const { error: insertError } = await supabase
          .from('silo_capacities')
          .insert(newRecords);

        if (insertError) {
          console.error('Error bulk inserting silo capacities:', insertError);
          throw new Error('Failed to insert new records');
        }

        // Only delete old records after successful insert
        if (existingRecords && existingRecords.length > 0) {
          const { error: deleteError } = await supabase
            .from('silo_capacities')
            .delete()
            .in(
              'id',
              existingRecords.map((r) => r.id)
            );

          if (deleteError) {
            console.error('Error clearing old silo capacities:', deleteError);
            // Don't throw here as new data is already saved
          }
        }
      } else {
        // If no new records, just clear existing ones
        if (existingRecords && existingRecords.length > 0) {
          const { error: deleteError } = await supabase
            .from('silo_capacities')
            .delete()
            .in(
              'id',
              existingRecords.map((r) => r.id)
            );

          if (deleteError) {
            console.error('Error clearing silo capacities:', deleteError);
            throw new Error('Failed to clear existing records');
          }
        }
      }

      // Refresh the data
      fetchRecords();
    } catch (error) {
      console.error('Error in setAllRecords:', error);
      // Re-fetch to ensure UI is in sync with database
      fetchRecords();
      throw error;
    }
  }, [fetchRecords]);


  return { records, loading, addRecord, updateRecord, deleteRecord, setAllRecords };
};
import { useState, useCallback, useEffect } from 'react';
import { ReportSetting } from '../types';
import { supabase } from '../utils/supabase';

export const useReportSettings = () => {
  const [records, setRecords] = useState<ReportSetting[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('report_settings')
      .select('*')
      .order('category');
      
    if (error) {
      console.error('Error fetching report settings:', error);
      setRecords([]);
    } else {
      setRecords((data || []) as any[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const addRecord = useCallback(async (record: Omit<ReportSetting, 'id'>) => {
    const { error } = await supabase.from('report_settings').insert([record]);
    if (error) console.error('Error adding report setting:', error);
    else fetchRecords();
  }, [fetchRecords]);

  const updateRecord = useCallback(async (updatedRecord: ReportSetting) => {
    const { id, ...updateData } = updatedRecord;
    const { error } = await supabase.from('report_settings').update(updateData).eq('id', id);
    if (error) console.error('Error updating report setting:', error);
    else fetchRecords();
  }, [fetchRecords]);

  const deleteRecord = useCallback(async (recordId: string) => {
    const { error } = await supabase.from('report_settings').delete().eq('id', recordId);
    if (error) console.error('Error deleting report setting:', error);
    else fetchRecords();
  }, [fetchRecords]);
  
  const setAllRecords = useCallback(async (newRecords: Omit<ReportSetting, 'id'>[]) => {
    try {
      // Use upsert approach to avoid race condition
      const { data: existingRecords, error: fetchError } = await supabase
        .from('report_settings')
        .select('*');

      if (fetchError) {
        console.error('Error fetching existing report settings:', fetchError);
        throw new Error('Failed to fetch existing records');
      }

      if (newRecords.length > 0) {
        const { error: insertError } = await supabase
          .from('report_settings')
          .insert(newRecords);

        if (insertError) {
          console.error('Error bulk inserting report settings:', insertError);
          throw new Error('Failed to insert new records');
        }

        if (existingRecords && existingRecords.length > 0) {
          const { error: deleteError } = await supabase
            .from('report_settings')
            .delete()
            .in('id', existingRecords.map((r) => r.id));

          if (deleteError) {
            console.error('Error clearing old report settings:', deleteError);
          }
        }
      } else {
        if (existingRecords && existingRecords.length > 0) {
          const { error: deleteError } = await supabase
            .from('report_settings')
            .delete()
            .in('id', existingRecords.map((r) => r.id));

          if (deleteError) {
            console.error('Error clearing report settings:', deleteError);
            throw new Error('Failed to clear existing records');
          }
        }
      }

      fetchRecords();
    } catch (error) {
      console.error('Error in setAllRecords:', error);
      fetchRecords();
      throw error;
    }
  }, [fetchRecords]);

  return { records, loading, addRecord, updateRecord, deleteRecord, setAllRecords };
};
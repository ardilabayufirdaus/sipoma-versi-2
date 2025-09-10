import { useState, useCallback, useEffect } from 'react';
import { PicSetting } from '../types';
import { supabase } from '../utils/supabase';

export const usePicSettings = () => {
  const [records, setRecords] = useState<PicSetting[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('pic_settings')
      .select('*')
      .order('pic');
      
    if (error) {
      console.error('Error fetching PIC settings:', error);
      setRecords([]);
    } else {
      setRecords(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);


  const addRecord = useCallback(async (record: Omit<PicSetting, 'id'>) => {
    const { error } = await supabase.from('pic_settings').insert([record]);
    if (error) console.error('Error adding PIC setting:', error);
    else fetchRecords();
  }, [fetchRecords]);

  const updateRecord = useCallback(async (updatedRecord: PicSetting) => {
    const { id, ...updateData } = updatedRecord;
    const { error } = await supabase.from('pic_settings').update(updateData).eq('id', id);
    if (error) console.error('Error updating PIC setting:', error);
    else fetchRecords();
  }, [fetchRecords]);

  const deleteRecord = useCallback(async (recordId: string) => {
    const { error } = await supabase.from('pic_settings').delete().eq('id', recordId);
    if (error) console.error('Error deleting PIC setting:', error);
    else fetchRecords();
  }, [fetchRecords]);
  
  const setAllRecords = useCallback(async (newRecords: Omit<PicSetting, 'id'>[]) => {
    try {
      // Use upsert approach to avoid race condition
      const { data: existingRecords, error: fetchError } = await supabase
        .from('pic_settings')
        .select('*');

      if (fetchError) {
        console.error('Error fetching existing PIC settings:', fetchError);
        throw new Error('Failed to fetch existing records');
      }

      if (newRecords.length > 0) {
        const { error: insertError } = await supabase
          .from('pic_settings')
          .insert(newRecords);

        if (insertError) {
          console.error('Error bulk inserting PIC settings:', insertError);
          throw new Error('Failed to insert new records');
        }

        if (existingRecords && existingRecords.length > 0) {
          const { error: deleteError } = await supabase
            .from('pic_settings')
            .delete()
            .in('id', existingRecords.map((r) => r.id));

          if (deleteError) {
            console.error('Error clearing old PIC settings:', deleteError);
          }
        }
      } else {
        if (existingRecords && existingRecords.length > 0) {
          const { error: deleteError } = await supabase
            .from('pic_settings')
            .delete()
            .in('id', existingRecords.map((r) => r.id));

          if (deleteError) {
            console.error('Error clearing PIC settings:', deleteError);
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
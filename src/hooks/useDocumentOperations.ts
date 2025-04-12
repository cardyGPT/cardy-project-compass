
import { useCallback } from "react";
import { ProjectDocument, DataModel } from "@/types";
import { supabase } from "@/lib/supabase";
import { ToastActionElement } from "@/components/ui/toast";

type Toast = {
  title?: string;
  description?: string;
  action?: ToastActionElement;
  variant?: "default" | "destructive";
};

export const useDocumentOperations = (
  documents: ProjectDocument[],
  setDocuments: React.Dispatch<React.SetStateAction<ProjectDocument[]>>,
  setDataModel: React.Dispatch<React.SetStateAction<DataModel | null>>,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  toast: (props: Toast) => void
) => {
  const uploadDocument = async (documentData: Partial<ProjectDocument>, file: File) => {
    setLoading(true);
    try {
      // First upload the file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${documentData.projectId}/${Date.now()}.${fileExt}`;
      
      const { data: fileData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      // Create a public URL for the file
      const { data: urlData } = await supabase.storage
        .from('documents')
        .getPublicUrl(fileName);
      
      let fileContent = null;
      
      // If it's a data model, attempt to parse the JSON content
      if (documentData.type === "data-model") {
        try {
          const text = await file.text();
          fileContent = JSON.parse(text);
          
          // Basic validation of data model structure
          if (!fileContent.entities || !Array.isArray(fileContent.entities) || 
              !fileContent.relationships || !Array.isArray(fileContent.relationships)) {
            throw new Error("Invalid data model format");
          }
        } catch (parseError) {
          toast({
            title: "Error parsing JSON",
            description: "The data model file is not valid JSON or has incorrect format.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }
      
      const newDocument: Omit<ProjectDocument, 'id'> = {
        projectId: documentData.projectId || "",
        name: file.name,
        type: documentData.type || "system-requirements",
        fileUrl: urlData.publicUrl,
        fileType: file.type,
        uploadedAt: new Date().toISOString(),
        content: fileContent,
      };
      
      const { data: docData, error: docError } = await supabase
        .from('documents')
        .insert([newDocument])
        .select()
        .single();
      
      if (docError) throw docError;
      
      setDocuments((prev) => [...prev, docData]);
      
      if (docData.type === "data-model" && docData.content) {
        setDataModel(docData.content);
      }
      
      toast({
        title: "Upload successful",
        description: `${file.name} has been uploaded successfully.`,
      });
      
      return docData;
    } catch (error) {
      console.error("Error uploading document:", error);
      toast({
        title: "Upload failed",
        description: "There was an error uploading your document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteDocument = async (id: string) => {
    setLoading(true);
    try {
      // First get the document to find the file path
      const { data: doc, error: fetchError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Delete the file from storage if we have a URL
      if (doc.fileUrl) {
        const fileName = doc.fileUrl.split('/').pop();
        if (fileName) {
          const { error: storageError } = await supabase.storage
            .from('documents')
            .remove([fileName]);
          
          if (storageError) console.error("Error removing file from storage:", storageError);
        }
      }
      
      // Delete the document record
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
      
      toast({
        title: "Document deleted",
        description: "Document has been deleted successfully.",
      });
    } catch (error) {
      console.error("Error deleting document:", error);
      toast({
        title: "Error",
        description: "Failed to delete document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    uploadDocument,
    deleteDocument
  };
};

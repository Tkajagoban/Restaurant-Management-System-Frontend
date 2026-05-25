// Shared types for FoodContentManagement
export interface FoodVariant {
  id: string;
  name: string;
  price: number;
  status: 'Active' | 'Inactive';
  image?: string;
}

export interface SubCategory {
  id: string;
  name: string;
  status: 'Active' | 'Inactive';
  mainCategoryName?: string; // Actual main category name from backend
}

export interface Category {
  id: string;
  name: string;
  status: 'Active' | 'Inactive';
}

export type ModalType = 'category' | 'subcategory' | 'variant' | null;
export type ModalMode = 'add' | 'edit';

export interface CategoryFormData {
  id?: string;
  name: string;
  status: 'Active' | 'Inactive';
}

export interface SubCategoryFormData {
  id?: string;
  categoryId: string;
  name: string;
  status: 'Active' | 'Inactive';
}

export interface VariantFormData {
  id?: string;
  categoryId: string;
  subCategoryId: string;
  name: string;
  price: string;
  status: 'Active' | 'Inactive';
  image: string;
}

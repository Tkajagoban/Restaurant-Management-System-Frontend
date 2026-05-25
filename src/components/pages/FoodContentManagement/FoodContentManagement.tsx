import { useState, useEffect } from 'react';
import styles from './FoodContentManagement.module.css';
import Categories from './Categories';
import SubCategories from './SubCategories';
import Variants from './Variants';
import type { Category, SubCategory, FoodVariant } from './types';

interface SubWithParent extends SubCategory {
  categoryId: string;
  categoryName: string;
}

interface VariantWithMeta extends FoodVariant {
  categoryId: string;
  categoryName: string;
  subCategoryId: string;
  subCategoryName: string;
}

export default function FoodContentManagement() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [allSubCategories, setAllSubCategories] = useState<SubWithParent[]>([]);
  const [allVariants, setAllVariants] = useState<VariantWithMeta[]>([]);
  const [activeTab, setActiveTab] = useState<'categories' | 'subcategories' | 'variants'>('categories');

  // Pagination state
  const ITEMS_PER_PAGE = 10;
  const [catPage, setCatPage] = useState(1);
  const [subPage, setSubPage] = useState(1);
  const [varPage, setVarPage] = useState(1);

  // NOTE: Category/SubCategory/Variant CRUD and modal form state are handled inside child components.

  // Pagination logic for each tab
  const catTotalPages = Math.ceil(categories.length / ITEMS_PER_PAGE) || 1;
  const subTotalPages = Math.ceil(allSubCategories.length / ITEMS_PER_PAGE) || 1;
  const varTotalPages = Math.ceil(allVariants.length / ITEMS_PER_PAGE) || 1;

  const paginatedCategories = categories.slice((catPage - 1) * ITEMS_PER_PAGE, catPage * ITEMS_PER_PAGE);
  const paginatedSubCategories = allSubCategories.slice((subPage - 1) * ITEMS_PER_PAGE, subPage * ITEMS_PER_PAGE);
  const paginatedVariants = allVariants.slice((varPage - 1) * ITEMS_PER_PAGE, varPage * ITEMS_PER_PAGE);

  // Reset pages when data changes
  useEffect(() => { setCatPage(1); }, [categories.length]);
  useEffect(() => { setSubPage(1); }, [allSubCategories.length]);
  useEffect(() => {
    if (varPage > varTotalPages && varTotalPages > 0) {
      setVarPage(varTotalPages);
    }
  }, [allVariants.length, varTotalPages]);

  // Category/Subcategory/Variant CRUD now handled inside child components.
  // Parent keeps the global `categories` state and passes it + setter to children.

  return (
    <div className={styles.pageContainer}>
      <div className={styles.mainContent}>
        {/* Page Header */}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Food Management</h1>
            <p className={styles.pageSubtitle}>Manage categories, subcategories, and food variants</p>
          </div>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'categories' ? styles.active : ''}`}
            onClick={() => setActiveTab('categories')}
          >
            Main Categories
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'subcategories' ? styles.active : ''}`}
            onClick={() => setActiveTab('subcategories')}
          >
            Sub Categories
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'variants' ? styles.active : ''}`}
            onClick={() => setActiveTab('variants')}
          >
            Food Variants
          </button>
        </div>

        {/* Render split components (each child manages its own CRUD & modals) */}
        {activeTab === 'categories' && (
          <Categories
            categories={categories}
            setCategories={setCategories}
            paginatedCategories={paginatedCategories}
            catPage={catPage}
            setCatPage={setCatPage}
            catTotalPages={catTotalPages}
          />
        )}

        {activeTab === 'subcategories' && (
          <SubCategories
            categories={categories}
            allSubCategories={allSubCategories}
            setAllSubCategories={setAllSubCategories}
            paginatedSubCategories={paginatedSubCategories}
            subPage={subPage}
            setSubPage={setSubPage}
            subTotalPages={subTotalPages}
          />
        )}

        {activeTab === 'variants' && (
          <Variants
            categories={categories}
            allVariants={allVariants}
            setAllVariants={setAllVariants}
            paginatedVariants={paginatedVariants}
            varPage={varPage}
            setVarPage={setVarPage}
            varTotalPages={varTotalPages}
          />
        )}
      </div>
    </div>
  );
}

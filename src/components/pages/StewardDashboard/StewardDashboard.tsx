import { useEffect, useMemo, useState } from 'react';
// import { foodData } from '../../../data/foodData'; // Replaced by API
import styles from '../../pages/AdminDashboard/AdminDashboard.module.css'; // Re-use Admin styles
import { fetchMainCategories } from '../../../api/foodContentManagement/Category.api';
import { getSubCategoriesByMainCategory, type SubCategoryItemDto } from '../../../api/foodContentManagement/SubCategory.api';
import { getFoodsBySubCategory } from '../../../api/foodContentManagement/Variants.api';

interface StewardDashboardProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onAddToOrder?: (item: any) => void;
  totalTables?: number;
}

// Helper interfaces for state
interface MainCategory {
  id: string;
  name: string;
}

interface SubCategory {
  id: string;
  name: string;
}

interface FoodVariant {
  id: string;
  name: string;
  price: number;
  image?: string;
  subCategoryId?: string | number;
}

const isActiveValue = (val: unknown): boolean => {
  if (val === true || val === 'true' || val === 1 || val === '1') return true;
  if (val === 'Active' || (typeof val === 'string' && val.toLowerCase() === 'active')) return true;
  return false;
};

function StewardDashboard({ searchQuery, setSearchQuery, onAddToOrder }: StewardDashboardProps) {
  // State for data
  const [mainCategories, setMainCategories] = useState<MainCategory[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [foodVariants, setFoodVariants] = useState<FoodVariant[]>([]);

  // State for selection/expansion
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState<string | null>(null);

  // Loading states
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingSubCategories, setLoadingSubCategories] = useState(false);
  const [loadingFoods, setLoadingFoods] = useState(false);

  // 1. Fetch Main Categories on mount
  useEffect(() => {
    const loadMainCategories = async () => {
      setLoadingCategories(true);
      try {
        const response = await fetchMainCategories();
        const rawData = response.data;
        const content = Array.isArray(rawData) ? rawData : (rawData?.content || []);

        const mappedCategories = content
          .filter((c: any) => isActiveValue(c.status)) // Hide Inactive Categories
          .map((c: any) => ({
            id: c.id.toString(),
            name: c.name
          }));
        setMainCategories(mappedCategories);

        // Auto-select first category
        if (mappedCategories.length > 0) {
          setSelectedCategoryId(mappedCategories[0].id);
        }
      } catch (error) {
        console.error("Failed to load main categories", error);
      } finally {
        setLoadingCategories(false);
      }
    };

    loadMainCategories();
  }, []);

  // 2. Fetch Sub Categories when Main Category changes
  useEffect(() => {
    const loadSubCategories = async () => {
      if (!selectedCategoryId) {
        setSubCategories([]);
        setSelectedSubCategoryId(null);
        setFoodVariants([]);
        return;
      }
      setLoadingSubCategories(true);
      try {
        const response = await getSubCategoriesByMainCategory(Number(selectedCategoryId));
        const rawData = response.data;
        const content = Array.isArray(rawData) ? rawData : ((rawData as any)?.content || []);

        const mappedSubs = content
          .filter((s: SubCategoryItemDto) => isActiveValue(s.status)) // Hide Inactive Sub-Categories
          .map((s: SubCategoryItemDto) => ({
            id: s.id.toString(),
            name: s.subCategoryName
          }));
        setSubCategories(mappedSubs);

        // Auto-select first sub category
        if (mappedSubs.length > 0) {
          setSelectedSubCategoryId(mappedSubs[0].id);
        } else {
          setSelectedSubCategoryId(null);
          setFoodVariants([]);
        }
      } catch (error) {
        console.error("Failed to load sub categories", error);
        setSubCategories([]);
        setSelectedSubCategoryId(null);
        setFoodVariants([]);
      } finally {
        setLoadingSubCategories(false);
      }
    };

    loadSubCategories();
  }, [selectedCategoryId]);

  // 3. Fetch Food Variants when selected Sub Category changes
  useEffect(() => {
    const loadFoodVariants = async () => {
      if (!selectedCategoryId || !selectedSubCategoryId) {
        setFoodVariants([]);
        return;
      }
      setLoadingFoods(true);
      try {
        const response = await getFoodsBySubCategory(selectedCategoryId, selectedSubCategoryId);

        let content: any[] = [];
        // Handle nested response structures (based on AdminDashboard fixes)
        const resBody = response.data;
        if (resBody?.data?.content && Array.isArray(resBody.data.content)) {
          content = resBody.data.content;
        } else if (resBody?.content && Array.isArray(resBody.content)) {
          content = resBody.content;
        } else if (Array.isArray(resBody?.data)) {
          content = (resBody as any).data;
        } else if (Array.isArray(resBody)) {
          content = resBody;
        }

        const mappedFoods = content
          .filter((f: any) => isActiveValue(f.status)) // Hide Inactive Food Items
          .map((f: any) => ({
            id: f.id.toString(),
            name: f.foodName || f.name,
            price: f.price,
            image: f.foodImage || f.image,
            subCategoryId: f.subcategoryId || f.subCategoryId || f.sub_category_id
          }));

        // Strict Filter (checking user's instruction to ensure unrelated items are hidden)
        const filteredFoods = mappedFoods.filter((f: any) =>
          f.subCategoryId && String(f.subCategoryId) === String(selectedSubCategoryId)
        );

        setFoodVariants(filteredFoods);
      } catch (error) {
        console.error("Failed to load food variants", error);
        setFoodVariants([]);
      } finally {
        setLoadingFoods(false);
      }
    };

    loadFoodVariants();
  }, [selectedCategoryId, selectedSubCategoryId]);

  const toggleCategory = (catId: string) => {
    if (selectedCategoryId !== catId) {
      setSelectedCategoryId(catId);
    }
  };

  const toggleSubCategory = (subId: string) => {
    if (selectedSubCategoryId !== subId) {
      setSelectedSubCategoryId(subId);
    }
  };

  // Filter local food items based on search query
  const displayFoods = useMemo(() => {
    if (!searchQuery.trim()) return foodVariants;
    const query = searchQuery.toLowerCase();
    return foodVariants.filter(f => f.name.toLowerCase().includes(query));
  }, [foodVariants, searchQuery]);


  const handleAddToOrder = (variant: FoodVariant) => {
    if (onAddToOrder) {
      // Find names for category and subcategory
      const catName = mainCategories.find(c => c.id === selectedCategoryId)?.name || '';
      const subName = subCategories.find(s => s.id === selectedSubCategoryId)?.name || '';

      onAddToOrder({
        id: variant.id,
        name: variant.name,
        price: variant.price,
        category: catName,
        subCategory: subName,
      });
    }
  };

  return (
    <div className={styles.pageContainer}>
      {/* Search Bar */}
      <div className={styles.searchBar}>
        <input
          type="text"
          placeholder="Search food items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {/* Section Title */}
      <h3 className={styles.sectionTitle}>Main Food Category</h3>

      {/* Main Categories Row */}
      <div className={styles.categoriesRow}>

        {loadingCategories ? (
          <div className={styles.loading}>Loading categories...</div>
        ) : (
          mainCategories.map((category) => (
            <button
              key={category.id}
              className={`${styles.categoryCard} ${selectedCategoryId === category.id ? styles.active : ''}`}
              onClick={() => toggleCategory(category.id)}
            >
              <span className={styles.categoryName}>{category.name}</span>
            </button>
          ))
        )}
      </div>

      {/* Expanded Category Content */}
      {selectedCategoryId && (
        <div className={styles.expandedContent}>
          <div className={styles.expandedHeader}>
            <span className={styles.expandedTitle}>
              {mainCategories.find(c => c.id === selectedCategoryId)?.name}
            </span>
            {subCategories.length > 0 && (
              <span className={styles.expandedMeta}>{subCategories.length} subcategories</span>
            )}
          </div>

          {/* Subcategories - Row-wise */}
          <div className={styles.subCategoriesRow}>
            {loadingSubCategories ? (
              <div className={styles.loadingSmall}>Loading subcategories...</div>
            ) : (
              subCategories.map((sub) => (
                <button
                  key={sub.id}
                  className={`${styles.subCategoryCard} ${selectedSubCategoryId === sub.id ? styles.active : ''}`}
                  onClick={() => toggleSubCategory(sub.id)}
                >
                  <span className={styles.subCategoryName}>{sub.name}</span>
                </button>
              ))
            )}
          </div>

          {/* Food Variants */}
          {selectedSubCategoryId && (
            <div className={styles.variantsSection}>
              <div className={styles.variantsHeader}>
                <span className={styles.variantsTitle}>
                  {subCategories.find(s => s.id === selectedSubCategoryId)?.name}
                </span>
                <span className={styles.variantsMeta}>{displayFoods.length} items</span>
              </div>
              <div className={styles.variantsGrid}>
                {loadingFoods ? (
                  <div>Loading items...</div>
                ) : displayFoods.length === 0 ? (
                  <p className={styles.noItems}>No food variants available</p>
                ) : (
                  displayFoods.map((variant) => (
                    <button
                      key={variant.id}
                      className={styles.variantCard}
                      onClick={() => handleAddToOrder(variant)}
                    >
                      <div className={styles.variantImage}>
                        {variant.image ? (
                          <img src={variant.image} alt={variant.name} />
                        ) : (
                          <span className={styles.variantPlaceholder}>🍽️</span>
                        )}
                      </div>
                      <div className={styles.variantInfo}>
                        <span className={styles.variantName}>{variant.name}</span>
                        <span className={styles.variantPrice}>Rs. {variant.price.toFixed(2)}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default StewardDashboard;

import { useEffect, useMemo, useState, useRef } from 'react';
// import { foodData } '../../../data/foodData'; // Replaced by API
import styles from './AdminDashboard.module.css';
import StatusSummary, { type StatusStats } from '../../molecules/StatusSummary/StatusSummary';
import { fetchMainCategories } from '../../../api/foodContentManagement/Category.api';
import { getSubCategoriesByMainCategory, type SubCategoryItemDto } from '../../../api/foodContentManagement/SubCategory.api';
import { getFoodsBySubCategory, getAllFoodVariants } from '../../../api/foodContentManagement/Variants.api';

interface AdminDashboardProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onAddToOrder?: (item: any) => void;
  table: string;
  steward: string;
  orderType: 'dine-in' | 'take-away';
  orderItems: { name: string; price: number; quantity: number }[];
  statusStats?: StatusStats;
  totalTables?: number;
}

// Helper interfaces for state
interface MainCategory {
  id: string;
  name: string;
  flag?: string;
  status?: boolean; // Added for filtering
}

interface SubCategory {
  id: string;
  name: string;
  status?: boolean; // Added for filtering
}

interface FoodVariant {
  id: string;
  name: string;
  price: number;
  image?: string;
  subCategoryId?: string | number;
  status?: boolean | string; // Added for filtering
}

function AdminDashboard({ searchQuery, setSearchQuery, onAddToOrder, statusStats }: AdminDashboardProps) {
  // State for data
  const [mainCategories, setMainCategories] = useState<MainCategory[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [foodVariants, setFoodVariants] = useState<FoodVariant[]>([]);

  // New State for Global Search
  const [allGlobalItems, setAllGlobalItems] = useState<FoodVariant[]>([]);

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
        // Fetch Categories
        const catRes = await fetchMainCategories();
        const rawCats = catRes.data;
        const content = Array.isArray(rawCats) ? rawCats : (rawCats?.content || []);

        const mappedCategories = content
          .map((c: any) => ({
            id: c.id.toString(),
            name: c.name,
            flag: c.flag || '🍴',
            status: c.status
          }))
          // Filter: Only Active Main Categories
          .filter((c: MainCategory) => c.status === true);

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

  // 1.5 Fetch ALL Food Variants for Global Search on mount
  const hasFetchedGlobal = useRef(false);
  useEffect(() => {
    if (!hasFetchedGlobal.current) {
      hasFetchedGlobal.current = true;
      const loadGlobalItems = async () => {
        try {
          const res = await getAllFoodVariants({ size: 1000 });
          if (res.data && Array.isArray(res.data.content)) {
            const mappedGlobal = res.data.content.map((f: any) => ({
              id: f.id.toString(),
              name: f.foodName || f.name || '',
              price: f.price,
              image: f.image || f.foodImage || undefined,
              subCategoryId: f.subCategoryId || f.subCategory_id || '',
              status: (f.status === true || f.status === 'Active' || String(f.status) === 'true') ? 'Active' : 'Inactive'
            })).filter((f: any) => f.status === 'Active'); // Only active items for POS

            setAllGlobalItems(mappedGlobal);
          }
        } catch (err) {
          console.error("Failed to load global food items", err);
        }
      };
      loadGlobalItems();
    }
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
          .map((s: SubCategoryItemDto) => ({
            id: s.id.toString(),
            name: s.subCategoryName,
            status: s.status
          }))
          // Filter: Only Active Sub Categories
          .filter((s: SubCategory) => s.status === true);

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
        console.log(`Fetching foods for Cat: ${selectedCategoryId}, SubCat: ${selectedSubCategoryId}`);
        const response = await getFoodsBySubCategory(selectedCategoryId, selectedSubCategoryId);

        let content: any[] = [];
        if (response?.data?.content && Array.isArray(response.data.content)) {
          content = response.data.content;
        } else if (response?.content && Array.isArray(response.content)) {
          content = response.content;
        } else if (Array.isArray(response?.data)) {
          content = response.data;
        }

        const mappedFoods = content.map((f: any) => ({
          id: f.id.toString(),
          name: f.foodName || f.name,
          price: f.price,
          image: f.foodImage || f.image,
          subCategoryId: f.subcategoryId || f.subCategoryId || f.sub_category_id,
          status: f.status
        }));

        // Filter: Strict SubCategory match AND Active Status
        const filteredFoods = mappedFoods.filter((f: any) =>
          (f.subCategoryId && String(f.subCategoryId) === String(selectedSubCategoryId)) &&
          (f.status === true || f.status === 'Active')
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

  const handleAddToOrder = (variant: FoodVariant) => {
    if (onAddToOrder) {
      // For Search Results, we might not have selectedCategoryId active matching the item
      // So detailed tracking might be less accurate, but sufficient for Order
      const catName = mainCategories.find(c => c.id === selectedCategoryId)?.name || 'Unknown Category';
      const subName = subCategories.find(s => s.id === selectedSubCategoryId)?.name || 'Unknown Subcategory';

      onAddToOrder({
        id: variant.id,
        name: variant.name,
        price: variant.price,
        category: catName,
        subCategory: subName,
      });
    }
  };

  // Filter local food items based on search query
  const displayFoods = useMemo(() => {
    const isSearching = searchQuery.trim().length > 0;

    // If Searching -> Filter Global Items
    if (isSearching) {
      const query = searchQuery.toLowerCase();
      return allGlobalItems.filter(f => f.name.toLowerCase().includes(query));
    }

    // Else -> Show local category-specific items
    return foodVariants;
  }, [foodVariants, allGlobalItems, searchQuery]);

  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className={styles.pageContainer}>
      <div className={styles.searchBar}>
        <input
          type="text"
          placeholder="Search food items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {/* Status Summary - Admin only */}
      {statusStats && !isSearching && <StatusSummary stats={statusStats} />}

      {/* Conditional Rendering: Search Results vs Category Drilldown */}
      {isSearching ? (
        <div className={styles.variantsSection}>
          <div className={styles.variantsHeader}>
            <span className={styles.variantsTitle}>Search Results</span>
            <span className={styles.variantsMeta}>{displayFoods.length} items found</span>
          </div>

          <div className={styles.variantsGrid}>
            {displayFoods.length === 0 ? (
              <p className={styles.noItems}>No matching food items found.</p>
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
      ) : (
        <>
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
                  <span className={styles.categoryFlag}>{category.flag}</span>
                  <span className={styles.categoryName}>{category.name}</span>
                </button>
              ))
            )}
          </div>

          {selectedCategoryId && (
            <div className={styles.expandedContent}>
              <div className={styles.expandedHeader}>
                {/* Optional: Show selected category details */}
                <span className={styles.expandedTitle}>
                  {mainCategories.find(c => c.id === selectedCategoryId)?.name}
                </span>
                {subCategories.length > 0 && (
                  <span className={styles.expandedMeta}>{subCategories.length} subcategories</span>
                )}
              </div>

              {/* Sub Categories Row */}
              <div className={styles.subCategoriesRow}>
                {loadingSubCategories ? (
                  <div className={styles.loadingSmall}>Loading subcategories...</div>
                ) : subCategories.length === 0 ? (
                  <p className={styles.emptyText}>No subcategories found.</p>
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

              {/* Food Variants Grid */}
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
                      <div className={styles.loadingSmall}>Loading items...</div>
                    ) : displayFoods.length === 0 ? (
                      <p className={styles.noItems}>No food items found.</p>
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
        </>
      )}
    </div>
  );
}

export default AdminDashboard;

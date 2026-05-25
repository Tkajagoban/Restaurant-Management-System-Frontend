import React, { useEffect, useState, useMemo } from "react";
import { AxiosError } from "axios";
import { FaEdit } from "react-icons/fa";
import { Button } from '../../../components/atoms/Button/Button';
import { MdDelete } from 'react-icons/md';
import { FormField } from "../../../components/molecules/FormField/FormField";
import { Input } from "../../../components/atoms/Input/Input";
import { Label } from "../../../components/atoms/Label/Label";
import { Modal } from "../../../components/organisms/Modal/Modal";
import { DataTable, type Column } from "../../../components/organisms/DataTable/DataTable";
import { usePrivilege } from "../../../hooks/usePrivilege";

import {
  addRestaurant,
  updateRestaurant,
  getRestaurant,
  type Restaurant,
  ValidationError,
} from "../../../api/restaurantManagement/RestaurantManagement.api";

import ConfirmModal from "../../organisms/Modal/ConfirmModal";
import styles from "./RestaurantList.module.css";
import { validatePhoneNumber, sanitizePhoneInput, formatPhoneDisplay } from "../../../utils/phoneValidation";

const RestaurantSingle: React.FC = () => {
  const { canWrite } = usePrivilege('Restaurant Management');
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    id: 0,

    name: "",
    address: "",
    city: "",
    email: "",
    phoneNumber: "",
    webSite: "",
  });
  const [logoImage, setLogoImage] = useState<File | null>(null);
  const [isLogoRemoved, setIsLogoRemoved] = useState(false);

  // Confirm modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmShowSuccess, setConfirmShowSuccess] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | undefined>(undefined);
  const [confirmConfirmText, setConfirmConfirmText] = useState('OK');

  const sanitizeFormData = (data: typeof formData) => ({
    ...data,
    name: data.name.trim(),
    address: data.address.trim(),
    city: data.city.trim(),
    email: data.email.trim(),
    phoneNumber: data.phoneNumber.trim(),
    webSite: data.webSite.trim(),
  });

  const normalizePhoneNumber = (value: string) => value.replace(/\s+/g, "");

  const validateRequiredFields = (data: typeof formData) => {
    const errors: Record<string, string> = {};
    if (!data.name.trim()) errors.name = "Name is required";
    if (!data.address.trim()) errors.address = "Address is required";
    if (!data.city.trim()) errors.city = "City is required";
    if (!data.email.trim()) {
      errors.email = "Email is required";
    } else if (/\s/.test(data.email)) {
      errors.email = "Email cannot contain spaces";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
      errors.email = "Invalid email format";
    }
    if (!data.phoneNumber.trim()) errors.phoneNumber = "Phone number is required";
    return errors;
  };

  useEffect(() => {
    loadRestaurant();
  }, []);

  const loadRestaurant = async () => {
    try {
      const response = await getRestaurant();
      if (response.statusCode === 2000 && response.data.length > 0) {
        const r = response.data[0];
        console.log("Loaded Restaurant Data:", r); // DEBUG: Check if 'id' exists here
        setRestaurant(r);
        setFormData({
          id: r.id || 0, // Restore ID assignment
          name: r.name ?? "",
          address: r.address ?? "",
          city: r.city ?? "",
          email: r.email ?? "",
          phoneNumber: formatPhoneDisplay(r.phoneNumber ?? ""),
          webSite: r.webSite ?? "",
        });
      }
    } catch (error) {
      console.error("Failed to fetch restaurant", error);
    }
  };

  const openModal = () => {
    if (restaurant) {
      setFormData({
        id: restaurant.id || 0,
        name: restaurant.name ?? "",
        address: restaurant.address ?? "",
        city: restaurant.city ?? "",
        email: restaurant.email ?? "",
        phoneNumber: formatPhoneDisplay(restaurant.phoneNumber ?? ""),
        webSite: restaurant.webSite ?? "",
      });
    } else {
      setFormData({
        id: 0,
        name: "",
        address: "",
        city: "",
        email: "",
        phoneNumber: "",
        webSite: "",
      });
    }
    setLogoImage(null); // reset file input
    setIsLogoRemoved(false);
    setFieldErrors({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setLogoImage(null);
    setIsLogoRemoved(false);
    setFieldErrors({});
  };

  const clearFieldError = (field: string) => {
    setFieldErrors(prev => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const showSuccess = (msg: string) => {
    setConfirmTitle('Success');
    setConfirmMessage(msg);
    setConfirmShowSuccess(true);
    setConfirmConfirmText('OK');
    setConfirmAction(undefined);
    setConfirmOpen(true);
  };

  const showError = (msg: string) => {
    setConfirmTitle('Error');
    setConfirmMessage(msg);
    setConfirmShowSuccess(false);
    setConfirmConfirmText('OK');
    setConfirmAction(undefined);
    setConfirmOpen(true);
  };

  const isFormModified = !restaurant || (
    !!logoImage ||
    formData.name !== (restaurant.name ?? "") ||
    formData.address !== (restaurant.address ?? "") ||
    formData.city !== (restaurant.city ?? "") ||
    formData.email !== (restaurant.email ?? "") ||
    formData.phoneNumber !== formatPhoneDisplay(restaurant.phoneNumber ?? "") ||
    formData.webSite !== (restaurant.webSite ?? "") ||
    isLogoRemoved
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate ORIGINAL formData first (before sanitizing) to catch spaces
    const validationErrors = validateRequiredFields(formData);
    const sanitizedData = sanitizeFormData(formData);
    const phoneDigits = normalizePhoneNumber(sanitizedData.phoneNumber);
    // Phone number validation using centralized utility
    const phoneValidation = validatePhoneNumber(sanitizedData.phoneNumber, true);
    if (!phoneValidation.isValid && phoneValidation.error) {
      validationErrors.phoneNumber = phoneValidation.error;
    }
    if (Object.keys(validationErrors).length) {
      setFieldErrors(validationErrors);
      setFormData(prev => ({ ...prev, ...sanitizedData }));
      return;
    }

    if (!restaurant && !logoImage) {
      setFieldErrors({ logoImage: "Please select a logo image" });
      return;
    }

    try {
      setLoading(true);
      setFieldErrors({});

      if (restaurant && !restaurant.id) {
        console.error("Restaurant object missing ID:", restaurant);
        showError("Frontend Error: Restaurant ID not found. The backend 'GET' response is missing the 'id' field. Please fix your Java Backend DTO.");
        setLoading(false);
        return;
      }

      const response = restaurant
        ? await updateRestaurant({
          // Include existing logoImage string in DTO so backend knows we keep it
          dto: {
            ...sanitizedData,
            phoneNumber: phoneDigits,
            id: restaurant!.id // restaurant is guaranteed not null here
          },
          logoImage: logoImage || undefined,
          deleteLogo: isLogoRemoved,
        })
        : await addRestaurant({ dto: { ...sanitizedData, phoneNumber: phoneDigits }, logoImage: logoImage! });

      setRestaurant(response.data);
      closeModal();
      showSuccess(restaurant ? 'Updated successfully' : 'Created successfully');

    } catch (err: any) {
      console.error("Save error:", err);
      if (err instanceof ValidationError) {
        setFieldErrors(err.fieldErrors || {});
      } else if (err instanceof AxiosError) {
        const respData = err.response?.data;
        if (respData?.statusCode === 4022 && Array.isArray(respData.data)) {
          const errors: Record<string, string> = {};
          respData.data.forEach((item: any) => {
            const msg: string = item.message || item.error || "";
            const [field, ...rest] = msg.split(":").map(s => s.trim());
            const text = rest.join(":") || msg;
            if (field) errors[field] = text;
          });
          setFieldErrors(errors);

          // Heuristic: If name and address are both missing, it's likely the Backend DTO is broken
          if (errors.name && errors.address) {
            showError("Backend Rejected Data: All fields appear missing. This usually means your Java 'RestaurantDto' class is missing '@Data' or Getters/Setters.");
          }
        } else {
          showError(err.response?.data?.statusMessage || "API error occurred");
        }
      } else if (err instanceof Error) {
        showError(err.message);
      } else {
        showError("Unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  const columns: Column<Restaurant>[] = useMemo(() => [
    {
      header: 'Logo',
      accessor: (r) => {
        let src = "https://placehold.co/40";
        if (r.logoImage) {
          if (r.logoImage.startsWith('http')) {
            src = r.logoImage;
          } else {
            src = `data:image/png;base64,${r.logoImage}`;
          }
        }
        return (
          <img
            src={src}
            alt={r.name}
            className={styles.logoImg}
            style={{ objectFit: 'cover', width: '40px', height: '40px', borderRadius: '50%' }}
          />
        );
      }
    },
    { header: 'Name', accessor: (r) => r.name },
    { header: 'Address', accessor: (r) => r.address },
    { header: 'City', accessor: (r) => r.city },
    { header: 'Email', accessor: (r) => r.email },
    { header: 'Phone', accessor: (r) => formatPhoneDisplay(r.phoneNumber) },
    {
      header: 'Website',
      accessor: (r) => r.webSite ? <a href={r.webSite} target="_blank" rel="noreferrer">Visit</a> : '-'
    },
    {
      header: 'Action',
      accessor: () => (
        <button onClick={openModal} title="Edit Restaurant" disabled={!canWrite}>
          <FaEdit size={20} aria-hidden="true" />
        </button>
      )
    }
  ], [restaurant]);

  const tableData = restaurant ? [restaurant] : [];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Restaurant Management</h1>
        <Button
          onClick={openModal}
          disabled={!!restaurant || !canWrite}
          title={restaurant ? "Only one restaurant is allowed" : !canWrite ? "You don't have permission to add restaurants" : ""}
        >
          + Add Restaurant
        </Button>
      </div>

      <div className={styles.tableContainer}>
        <DataTable
          columns={columns}
          data={tableData}
          keyExtractor={(r) => (r.id || 'new').toString()}
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={restaurant ? "Update Restaurant" : "Add Restaurant"}
      >
        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <FormField
            label="Name"
            required
            value={formData.name}
            onChange={(e) => { setFormData(prev => ({ ...prev, name: e.target.value })); clearFieldError("name"); }}
            error={fieldErrors.name}
          />
          <FormField
            label="Address"
            required
            value={formData.address}
            onChange={(e) => { setFormData(prev => ({ ...prev, address: e.target.value })); clearFieldError("address"); }}
            error={fieldErrors.address}
          />
          <FormField
            label="City"
            required
            value={formData.city}
            onChange={(e) => { setFormData(prev => ({ ...prev, city: e.target.value })); clearFieldError("city"); }}
            error={fieldErrors.city}
          />
          <div style={{ marginBottom: '16px' }}>
            <Label required htmlFor="email-custom-input">Email</Label>
            <div style={{ marginTop: '8px' }}>
              <Input
                id="email-custom-input"
                type="text"
                name="email_browser_ignore"
                value={formData.email}
                onChange={(e) => { setFormData(prev => ({ ...prev, email: e.target.value })); clearFieldError("email"); }}
                error={!!fieldErrors.email}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            {fieldErrors.email && <span style={{ color: '#dc3545', fontSize: '12px', marginTop: '4px', display: 'block' }}>{fieldErrors.email}</span>}
          </div>
          <FormField
            label="Phone Number"
            required
            value={formData.phoneNumber}
            onChange={(e) => {
              const sanitized = sanitizePhoneInput(e.target.value);
              setFormData(prev => ({ ...prev, phoneNumber: sanitized }));
              // Real-time validation
              const validation = validatePhoneNumber(sanitized, true);
              if (validation.error) {
                setFieldErrors(prev => ({ ...prev, phoneNumber: validation.error! }));
              } else {
                clearFieldError("phoneNumber");
              }
            }}
            onBlur={() => {
              // Validate on blur as well
              const validation = validatePhoneNumber(formData.phoneNumber, true);
              if (validation.error) {
                setFieldErrors(prev => ({ ...prev, phoneNumber: validation.error! }));
              }
            }}
            error={fieldErrors.phoneNumber}
            placeholder="Enter 8-15 digits only"
          />
          <FormField
            label="Website"
            value={formData.webSite}
            onChange={(e) => { setFormData(prev => ({ ...prev, webSite: e.target.value })); clearFieldError("webSite"); }}
            error={fieldErrors.webSite}
          />
          <FormField
            label="Logo Image"
            type="file"
            accept="image/png,image/jpeg"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setLogoImage(e.target.files?.[0] || null); clearFieldError("logoImage"); }}
            error={fieldErrors.logoImage}
          />

          {/* Show existing or selected logo */}
          {(logoImage || (restaurant?.logoImage && !isLogoRemoved)) && (
            <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.9rem', color: '#666' }}>
                {logoImage ? 'Selected:' : 'Current:'}
              </span>
              <img
                src={
                  logoImage
                    ? URL.createObjectURL(logoImage)
                    : (restaurant?.logoImage?.startsWith('http')
                      ? restaurant.logoImage
                      : `data:image/png;base64,${restaurant?.logoImage}`)
                }
                alt="Logo Preview"
                style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #ccc' }}
              />
              <button
                type="button"
                onClick={() => { setLogoImage(null); setIsLogoRemoved(true); }}
                title="Remove Logo"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc3545', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <MdDelete size={20} />
              </button>
            </div>
          )}

          <div className={styles.formActions}>
            <Button type="button" variant="secondary" onClick={closeModal} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading || (!!restaurant && !isFormModified)}>{loading ? 'Saving...' : restaurant ? 'Update' : 'Save'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={confirmTitle}
        message={confirmMessage}
        showSuccess={confirmShowSuccess}
        confirmText={confirmConfirmText}
        onConfirm={confirmAction}
      />
    </div>
  );
};

export default RestaurantSingle;

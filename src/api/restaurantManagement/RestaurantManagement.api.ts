import instance from "../instance";

/* ---------- TYPES ---------- */
export interface Restaurant {
  id?: number; // optional for add
  name: string;
  address: string;
  city: string;
  email: string;
  phoneNumber: string;
  webSite: string;
  logoImage?: string;
}

export interface AddRestaurantRequest {
  dto: Restaurant;
  logoImage: File; // required for add
}

export interface UpdateRestaurantRequest {
  dto: Restaurant;
  logoImage?: File; // optional for update
  deleteLogo?: boolean;
}

export interface ApiResponse<T> {
  statusCode: number;
  statusMessage: string;
  data: T;
}

/* ---------- ERRORS ---------- */
export class ValidationError extends Error {
  public fieldErrors: Record<string, string>;
  public statusCode: number;

  constructor(
    statusMessage: string,
    details: Array<{ message?: string }>,
    statusCode = 4022
  ) {
    super(statusMessage);
    this.name = "ValidationError";
    this.statusCode = statusCode;
    this.fieldErrors = {};

    const parse = (msg?: string) => {
      if (!msg) return { field: "general", text: "Validation failed" };
      const parts = msg.split(":").map((s) => s.trim());
      if (parts.length >= 2)
        return { field: parts[0], text: parts.slice(1).join(":").trim() };
      return { field: "general", text: msg };
    };

    details.forEach((d) => {
      const { field, text } = parse(d.message);
      // if multiple messages for same field, concatenate
      this.fieldErrors[field] = this.fieldErrors[field]
        ? `${this.fieldErrors[field]}; ${text}`
        : text;
    });
  }
}

/* ---------- ADD RESTAURANT ---------- */
export const addRestaurant = async (
  requestData: AddRestaurantRequest
): Promise<ApiResponse<Restaurant>> => {
  const formData = new FormData();
  // Backend expects separate RequestParams for create
  formData.append("name", requestData.dto.name);
  formData.append("address", requestData.dto.address);
  formData.append("city", requestData.dto.city);
  formData.append("email", requestData.dto.email);
  formData.append("phoneNumber", requestData.dto.phoneNumber);
  formData.append("webSite", requestData.dto.webSite);

  // Backend create expects "logoImage" (camelCase) based on variable name
  formData.append("logoImage", requestData.logoImage);

  const response = await instance.post<ApiResponse<Restaurant>>(
    "settings/restaurant/added",
    formData,
    {
      headers: {
        'Content-Type': undefined
      }
    }
  );

  const data = response.data;
  if (data.statusCode !== 2000) {
    if (data.statusCode === 4022 && Array.isArray(data.data)) {
      throw new ValidationError(
        data.statusMessage,
        data.data as any,
        data.statusCode
      );
    }
    throw new Error(data.statusMessage);
  }

  return data;
};

/* ---------- UPDATE RESTAURANT ---------- */
export const updateRestaurant = async (
  requestData: UpdateRestaurantRequest
): Promise<ApiResponse<Restaurant>> => {
  if (!requestData.dto.id) {
    throw new Error("Restaurant ID is required for update");
  }

  const formData = new FormData();
  // Backend update uses @ModelAttribute, which binds flat form fields
  formData.append("name", requestData.dto.name);
  formData.append("address", requestData.dto.address);
  formData.append("city", requestData.dto.city);
  formData.append("email", requestData.dto.email);
  formData.append("phoneNumber", requestData.dto.phoneNumber);
  formData.append("webSite", requestData.dto.webSite);
  formData.append("id", String(requestData.dto.id));

  // Backend update explicitly requests "logoimage" (lowercase) in @RequestParam
  if (requestData.logoImage) {
    formData.append("logoimage", requestData.logoImage);
  } else if (requestData.deleteLogo) {
    // Workaround: Backend throws error on generic blob and ignores empty string.
    // We upload a 1x1 transparent PNG to visually "remove" the logo.
    const transparentPixel = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    const byteCharacters = atob(transparentPixel);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: "image/png" });

    // Append as a file
    formData.append("logoimage", blob, "deleted_logo.png");
  }

  const response = await instance.put<ApiResponse<Restaurant>>(
    `settings/restaurant/${requestData.dto.id}`,
    formData,
    {
      headers: {
        'Content-Type': undefined
      }
    }
  );

  const data = response.data;
  if (data.statusCode !== 2000) {
    if (data.statusCode === 4022 && Array.isArray(data.data)) {
      throw new ValidationError(
        data.statusMessage,
        data.data as any,
        data.statusCode
      );
    }
    throw new Error(data.statusMessage);
  }

  return data;
};

/* ---------- GET RESTAURANT ---------- */
export const getRestaurant = async (): Promise<ApiResponse<Restaurant[]>> => {
  const response = await instance.get<ApiResponse<Restaurant[]>>(
    "settings/restaurant"
  );
  const data = response.data;
  if (data.statusCode !== 2000) {
    if (data.statusCode === 4022 && Array.isArray(data.data)) {
      throw new ValidationError(
        data.statusMessage,
        data.data as any,
        data.statusCode
      );
    }
    throw new Error(data.statusMessage);
  }

  return data;
};

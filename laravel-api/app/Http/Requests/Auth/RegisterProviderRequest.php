<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class RegisterProviderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name'             => 'required|string|max:255',
            'email'            => 'required|email|unique:users,email',
            'phone'            => 'required|string|max:20',
            'password'         => 'required|string|min:8|confirmed',
            'business_name'    => 'required|string|max:255',
            'business_name_en' => 'nullable|string|max:255',
            'description'      => 'nullable|string|max:2000',
            'whatsapp'         => 'nullable|string|max:20',
            'category_id'      => 'required|exists:categories,id',
            'subcategory_id'   => 'nullable|exists:subcategories,id',
            'region_id'        => 'required|exists:regions,id',
            'city_id'          => 'required|exists:cities,id',
            'area_id'          => 'nullable|exists:areas,id',
            'address'          => 'nullable|string|max:500',
            'latitude'         => 'nullable|numeric|between:-90,90',
            'longitude'        => 'nullable|numeric|between:-180,180',
            'cr_number'        => 'nullable|string|max:50',
        ];
    }

    public function messages(): array
    {
        return [
            'business_name.required' => 'اسم المنشأة مطلوب',
            'category_id.required'   => 'التصنيف مطلوب',
            'region_id.required'     => 'المنطقة مطلوبة',
            'city_id.required'       => 'المدينة مطلوبة',
        ];
    }
}

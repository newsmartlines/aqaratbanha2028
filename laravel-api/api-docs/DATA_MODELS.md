# Data Models Reference

## users
| Column | Type | Description |
|--------|------|-------------|
| id | bigint PK | |
| name | string | Full name |
| email | string unique | Login email |
| phone | string nullable | Mobile number |
| password | string | Hashed (bcrypt) |
| role | enum | `user`, `provider`, `admin`, `moderator` |
| avatar | string nullable | Path relative to storage/app/public |
| city | string nullable | Free-text city |
| is_active | boolean | Account active flag |
| email_verified | boolean | Email verified flag |
| last_login_at | timestamp nullable | |
| created_at / updated_at | timestamps | |

---

## providers
| Column | Type | Description |
|--------|------|-------------|
| id | bigint PK | |
| user_id | FK → users | Owner user account |
| business_name | string | Arabic business name |
| business_name_en | string nullable | English name |
| description | text nullable | |
| phone / whatsapp / email / website | string nullable | Contact info |
| avatar / banner | string nullable | Image paths |
| category_id | FK → categories nullable | |
| subcategory_id | FK → subcategories nullable | |
| region_id / city_id / area_id | FK nullable | Location |
| address | string nullable | Street address |
| latitude / longitude | decimal nullable | GPS coordinates |
| status | enum | `pending`, `active`, `suspended`, `rejected` |
| is_featured / is_verified | boolean | Badges |
| rating | decimal(3,2) | Average rating 0-5 |
| reviews_count / views_count | int | Counters |
| package_id | FK → packages nullable | Current subscription package |
| package_tier | enum | `free`, `bronze`, `premium` |
| package_expires_at | timestamp nullable | Subscription expiry |
| working_hours / payment_methods | json nullable | |
| cr_number / vat_number | string nullable | Business registration |

---

## services
| Column | Type | Description |
|--------|------|-------------|
| id | bigint PK | |
| provider_id | FK → providers | |
| category_id / subcategory_id | FK nullable | |
| title | string | Service title |
| description | text nullable | |
| price / price_max | decimal nullable | |
| price_type | enum | `fixed`, `range`, `negotiable`, `free` |
| price_unit | string nullable | e.g. "per visit" |
| images | json nullable | Array of storage paths |
| is_active / is_featured | boolean | |
| views_count | int | |

---

## service_requests
| Column | Type | Description |
|--------|------|-------------|
| id | bigint PK | |
| public_id | string unique | e.g. `REQ-ABCD1234` |
| user_id | FK → users | Customer |
| provider_id | FK → providers | Service provider |
| service_id | FK → services nullable | |
| title | string | |
| description / address | text nullable | |
| budget / final_price | decimal nullable | |
| status | enum | `pending`, `accepted`, `rejected`, `in_progress`, `completed`, `cancelled`, `disputed` |
| commission_rate | decimal | Default 10% |
| commission_amount / provider_amount | decimal | Calculated on completion |
| is_paid | boolean | |
| scheduled_at / completed_at | timestamp nullable | |

---

## reviews
| Column | Type | Description |
|--------|------|-------------|
| id | bigint PK | |
| user_id | FK → users | Reviewer |
| provider_id | FK → providers | Target provider |
| service_request_id | FK nullable | Linked request |
| rating | tinyint 1-5 | |
| comment | text nullable | |
| provider_reply / replied_at | text / timestamp | |
| is_approved / is_hidden | boolean | Moderation flags |

---

## payments
| Column | Type | Description |
|--------|------|-------------|
| id | bigint PK | |
| payment_ref | string unique | e.g. `PAY-XXXXXXXXXX` |
| user_id | FK → users | Paying user |
| provider_id | FK → providers nullable | |
| type | enum | `subscription`, `service_request`, `wallet_topup` |
| amount | decimal | |
| currency | string | Default `SAR` |
| status | enum | `pending`, `completed`, `failed`, `refunded`, `cancelled` |
| gateway | string | Default `stcpay` |
| gateway_ref | string nullable | Gateway transaction ID |
| gateway_response | json nullable | Raw gateway response |
| package_id / service_request_id | FK nullable | What was paid for |
| paid_at | timestamp nullable | |

---

## payment_transactions
| Column | Type | Description |
|--------|------|-------------|
| id | bigint PK | |
| payment_id | FK → payments | |
| transaction_ref | string unique | e.g. `TXN-XXXXXXXXXXXX` |
| amount | decimal | |
| status | enum | `initiated`, `pending`, `success`, `failed`, `expired` |
| stcpay_session_id | string nullable | STC Pay session |
| stcpay_checkout_url | string nullable | Redirect URL |
| raw_response | json nullable | |
| expires_at | timestamp nullable | |

---

## subscriptions
| Column | Type | Description |
|--------|------|-------------|
| id | bigint PK | |
| provider_id | FK → providers | |
| package_id | FK → packages | |
| payment_id | FK → payments nullable | |
| status | enum | `active`, `expired`, `cancelled`, `pending` |
| amount_paid | decimal | |
| billing_cycle | enum | `monthly`, `yearly` |
| starts_at / expires_at | timestamp nullable | |

---

## packages
| Column | Type | Description |
|--------|------|-------------|
| id | bigint PK | |
| name / name_en | string | Package label |
| tier | enum | `free`, `bronze`, `premium` |
| price / yearly_price | decimal | |
| duration_days | int | |
| max_services | int | Service listing limit |
| max_images_per_service | int | Image upload limit |
| featured_listing / verified_badge | boolean | Feature flags |
| priority_support / analytics_access | boolean | |
| features | json | Display features list |

---

## notifications
| Column | Type | Description |
|--------|------|-------------|
| id | bigint PK | |
| user_id | FK → users | Target user |
| title / body | string / text | Content |
| type | string | `general`, `service_request`, `account_status`, `request_status`, etc. |
| data | json nullable | Extra payload |
| is_read / read_at | boolean / timestamp | |

---

## messages
| Column | Type | Description |
|--------|------|-------------|
| id | bigint PK | |
| sender_id / receiver_id | FK → users | |
| body | text | Message content |
| attachment | string nullable | File path |
| attachment_type | enum nullable | `image`, `file`, `voice` |
| is_read / read_at | boolean / timestamp | |

---

## support_tickets
| Column | Type | Description |
|--------|------|-------------|
| id | bigint PK | |
| public_id | string unique | e.g. `TK-12345` |
| user_id | FK → users | Submitter |
| assigned_to | FK → users nullable | Staff assignee |
| subject | string | |
| body | text | |
| status | enum | `open`, `in_progress`, `resolved`, `closed` |
| priority | enum | `low`, `medium`, `high`, `urgent` |
| category | string nullable | Topic category |

---

## admin_staff
| Column | Type | Description |
|--------|------|-------------|
| id | bigint PK | |
| user_id | FK → users | Linked moderator account |
| department | string nullable | |
| permissions | json | Array of permission strings |
| is_active | boolean | |

---

## provider_balances
| Column | Type | Description |
|--------|------|-------------|
| id | bigint PK | |
| provider_id | FK → providers unique | |
| available_balance | decimal | Withdrawable amount |
| pending_balance | decimal | Held amount |
| total_earned / total_withdrawn | decimal | Lifetime totals |

---

## wallet_transactions
| Column | Type | Description |
|--------|------|-------------|
| id | bigint PK | |
| provider_id | FK → providers | |
| type | enum | `credit`, `debit`, `hold`, `release`, `withdrawal` |
| amount | decimal | |
| balance_after | decimal | Running balance snapshot |
| description | string nullable | |
| reference_type / reference_id | polymorphic | What triggered this |
| status | enum | `pending`, `completed`, `failed` |

---

## site_settings
| Column | Type | Description |
|--------|------|-------------|
| id | bigint PK | |
| key | string unique | Setting key |
| value | text nullable | Setting value |
| group | string | `public`, `social`, `business`, `app` |
| type | string | `string`, `number`, `boolean`, `image`, `url` |

---

## regions / cities / areas
Hierarchical location tables: Region → City → Area

Each has: `name`, `name_en`, `is_active`, `sort_order`

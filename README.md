# Appwrite-Unique-Username-Function

A "Changeable Unique Username" is a common feature in many applications. 📝

How to make it? Just check the username availability in the database when the username input field is changed, right?

But, what if there are multiple users checking the same username at the same time? 🤔 All of them will get the same result, which is the username is available. This is because the username is not yet consumed by any user. Then, when they submit the form, the same username is likely to be used by multiple users. 🚨

🔑 The key point is, how to make sure the username is unique and able to deal with concurrent checking. 

This function allows you to check if a username is available or not with real-time checking compatibility instead of checking the availability of the username when the user submits the form.

## 🛠️ How It Work
![Unique Username Function](/docs/workflow.svg)

> [NOTE]\
> A reservation will be expired after 5 minutes. If the user submits the form within 5 minutes, the reservation will be extended for another 5 minutes, otherwise, the reservation will be expired and the username will be available for other users.

> [NOTE]\
> The unused reservation will be automatically deleted once the reservation maker is added to the consumer collection.

To make sure the username is unique, the reservation collection is using hashed username as the document ID. This way, the username will be unique and able to handle concurrent checking.

> [IMPORTANT]\
> It is highly recommended to check the username availability again when the user submits the form.

## 🚀 Deploy

### Before you start
1. Create a new collection for username reservation with the following schema:
    ```json
    [
      {
        "key": "reservationSessionId",
        "type": "string",
        "required": true,
        "array": false,
        "size": 36,
        "default": null
      },
      {
        "key": "expireAt",
        "type": "integer",
        "required": true,
        "array": false,
        "min": 0,
        "max": 9223372036854775807,
        "default": null
      }
    ]
    ```
    or create with CLI:
    ```bash
    appwrite push collection --collection-id 6712b6290012035ffb00
    ```

2. Create a new collection for storing usernames that are already taken (i.e. collection that consum the username, eg. profile) with the following schema:
    ```json
    [
      {
        "key": "username", // make sure with exact key name
        "type": "string",
        "required": true,
        "array": false,
        "size": 100,
        "default": null
      }
    ]
    ```
    or create with CLI:
    ```bash
    appwrite push collection --collection-id 6712b602001d009e6179
    ```
3. If you create the consumer collection manually, make sure to edit the `events` in the function to point to the correct collection ID in the `appwrite.json` file.
    ```json
    "events": [
        "databases.*.collections.<your_collection_id>.documents.*.create"
      ],
    ```

### Deploy With Appwrite CLI

1. Run the following command:
```bash
appwrite push function --function-id 6710259400075a51b8e7
```

2. Create a new environment variable with the following key-value pairs:
    - `APPWRITE_DATABASE_ID`: Your Appwrite database ID.
    - `APPWRITE_COLLECTION_ID`: A collection ID for storing usernames that will be consumed.
    - `APPWRITE_USERNAME_RESERVATION_COLLECTION_ID`: A collection ID for storing username reservations.

  (Check the [Environment Variables](#-environment-variables) section for more details)

## 🧰 Usage

### POST /check

- Returns username availability.

**Request**:

```json
{
  "username": "john_doe" // max 100 characters
}
```

**Response**

Sample `200` Response:

```json
{
  "available": true // or false
}
```

## ⚙️ Configuration

| Setting           | Value                          |
| ----------------- | ------------------------------ |
| Runtime           | Node (18.0)                    |
| Entrypoint        | `dist/main.js`                 |
| Build Commands    | `npm install && npm run build` |
| Permissions       | `any`                          |
| Timeout (Seconds) | 15                             |

## 🔒 Environment Variables

| Key      | Value | Description |
| -------- | ----- | ----------- |
| `APPWRITE_DATABASE_ID` | `your_database_id` | Your Appwrite database ID. |
| `APPWRITE_COLLECTION_ID` | `your_collection_id` | A collection ID for storing usernames that will be consumed. |
| `APPWRITE_USERNAME_RESERVATION_COLLECTION_ID` | `your_username_reservation_collection_id` | A collection ID for storing username reservations |

## 🐛 Known Issues

- Waiting for your report.

## ⭐ TODO

- N/A

## 🤝 Contributing

Contributions are welcome! If you find a bug or have a feature request, please open an issue. If you want to contribute code, please fork the repository and submit a pull request.

## 📝 License

This project is licensed under the GNU3 License - see the [LICENSE](LICENSE) file for details

## ☕ Donation

Love it? Consider a donation to support my work.

[!["Donation"](https://raw.githubusercontent.com/soranoo/Donation/main/resources/image/DonateBtn.png)](https://github.com/soranoo/Donation) <- click me~

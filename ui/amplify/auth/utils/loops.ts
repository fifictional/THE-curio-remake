const loopsEndpoint = "https://app.loops.so/api/v1/contacts";
const currentBranch = process.env.AWS_BRANCH || "local";
const SYNC_TO_LOOPS = currentBranch === 'release' ? 'true' : 'false'

export const createUserInLoops = async (email: string, firstName: string, lastName: string) => {
  const loopsApiKey = process.env.LOOPS_API_KEY;
  if (!loopsApiKey) {
    console.error("Loops API key is not set");
    return;
  }

  try {
    console.log("Creating user in Loops:", email, firstName, lastName);
    // Call Loops API to add contact
    const response = await fetch(`${loopsEndpoint}/create`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${loopsApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        firstName,
        lastName,
        // format date as UNIX Timestamp https://loops.so/docs/contacts/properties#dates
        lastLogin: new Date().getTime(),
        source: "cognito",
        emailVerified: false,
      })
    });
    console.log("Loops response:", await response.text());
  } catch (error) {
    console.error("Error creating user in Loops:", error);
  }
}

// verify user in Loops
// google auth users will not be created, but the update creates them
export const verifyUserInLoops = async (email: string, firstName: string, lastName: string) => {
  const loopsApiKey = process.env.LOOPS_API_KEY;
  if (!loopsApiKey) {
    console.error("Loops API key is not set");
    return;
  }

  try {
    // Call Loops API to update contact
    // google auth users will not be created, but the update creates them
    const response = await fetch(`${loopsEndpoint}/update`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${loopsApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        firstName,
        lastName,
        // format date as UNIX Timestamp https://loops.so/docs/contacts/properties#dates
        lastLogin: new Date().getTime(),
        source: "cognito",
        emailVerified: true,
      })
    });
    console.log("Loops response:", await response.text());
  } catch (error) {
      console.error("Error updating user in Loops:", error);
  }
}

export const updateLoopsContact = async (data: Record<string, any>) => {
  const loopsApiKey = process.env.LOOPS_API_KEY;

  if (!loopsApiKey) {
    console.error("Loops API key is not set");
    return;
  }

  if (SYNC_TO_LOOPS !== 'true') {
    return console.log("loop event received but SYNC_TO_LOOPS is not true", data);
  }

  try {
    const response = await fetch("https://app.loops.so/api/v1/contacts/update", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${loopsApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    const resText = await response.text();
    console.log("Loops API Response:", resText);
    return resText;
  } catch (err) {
    console.error("Loops API Error:", err);
    throw err;
  }
};

export const updateLastLoginDateLoops = async (email: string) => {
  const loopsApiKey = process.env.LOOPS_API_KEY;
  if (!loopsApiKey) {
    console.error("Loops API key is not set");
    return;
  }

  try {
    console.log("Updating last login date in Loops:", email);
    // Call Loops API to update contact with last login date
    const response = await fetch(`${loopsEndpoint}/update`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${loopsApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        // format date as UNIX Timestamp https://loops.so/docs/contacts/properties#dates
        lastLogin: new Date().getTime()
      })
    });
    console.log("Loops response:", await response.text());
  } catch (error) {
    console.error("Error updating last login date in Loops:", error);
  }
}
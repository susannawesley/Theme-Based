import tkinter as tk
import customtkinter as ctk
from PIL import Image
from customtkinter import CTkImage
import torch
from diffusers import StableDiffusionPipeline

# Create the app window
app = tk.Tk()
app.geometry("532x632")
app.title("Stable Bud")
ctk.set_appearance_mode("dark")

# Prompt input box
prompt = ctk.CTkEntry(master=app, height=40, width=512, text_color="black", fg_color="white")
prompt.place(x=10, y=10)

# Label to show generated image
lmain = ctk.CTkLabel(master=app, height=512, width=512, text="")
lmain.place(x=10, y=110)

# Load model
device = "cuda" if torch.cuda.is_available() else "cpu"
dtype = torch.float16 if device == "cuda" else torch.float32

pipe = None
try:
    # Try using a stable and widely used model available on Hugging Face
    pipe = StableDiffusionPipeline.from_pretrained(
        "CompVis/stable-diffusion-v-1-4-original",  # A widely used and stable model name
        revision="fp16" if device == "cuda" else None,
        torch_dtype=dtype
    )
    pipe.to(device)
    pipe.safety_checker = lambda images, **kwargs: (images, [False] * len(images))  # Disable safety checker
except Exception as e:
    print(f"Error loading Stable Diffusion model: {e}")

# Generate image from prompt
def generate():
    prompt_text = prompt.get()

    if not prompt_text:
        print("Prompt cannot be empty")
        return  # Don't proceed if no prompt is provided

    if pipe is None:
        print("Stable Diffusion model is not loaded properly.")
        return

    try:
        if device == "cuda":
            with torch.autocast("cuda"):
                result = pipe(prompt_text, guidance_scale=7.5, num_inference_steps=25)
        else:
            with torch.no_grad():
                result = pipe(prompt_text, guidance_scale=7.5, num_inference_steps=25)

        # Get the first image and resize it
        image = result.images[0].resize((512, 512))

        # Convert the image for CustomTkinter
        ctk_image = CTkImage(light_image=image, dark_image=image, size=(512, 512))

        # Update the label with the generated image
        lmain.configure(image=ctk_image)
        lmain.image = ctk_image  # Keep reference to avoid garbage collection

    except Exception as e:
        print(f"Error generating image: {e}")

# Button to trigger generation
trigger = ctk.CTkButton(
    master=app,
    height=40, width=120, text_color="white", fg_color="blue", command=generate,
    text="Generate"
)
trigger.place(x=206, y=60)

# Start the app
app.mainloop()

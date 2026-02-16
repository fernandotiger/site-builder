import React, { useRef, useState } from "react";
import { X } from 'lucide-react';
import api from '@/configs/axios';
import { toast } from 'sonner';
import {
    Image as ImageIcon,
    Crop,
    ImageMinus,
    Loader2Icon,
    Images,
    ImageUpscaleIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { AxiosError } from "axios";

type Props = {
    selectedEl: any | null;
    onClose: ()=> void;
};

interface UploadResponse {
    url: string;
    fileId: string;
    filePath: string;
    thumbnailUrl?: string;
}

interface GenerateAiImageResponse {
    url: string;
}

const transformOptions = [
    { label: "Smart Crop", value: "smartcrop", icon: <Crop />, transformation: 'fo-auto' },
    { label: "Dropshadow", value: "dropshadow", icon: <Images />, transformation: 'e-dropshadow' },
    { label: "Upscale", value: "upscale", icon: <ImageUpscaleIcon />, transformation: 'e-upscale' },
    { label: "BG Remove", value: "bgremove", icon: <ImageMinus />, transformation: 'e-bgremove' },
];

const API_IMAGE_BASE_URL = '/api/image';

function ImageSettingSection({ selectedEl, onClose }: Props) {
    const [altText, setAltText] = useState(selectedEl.alt || "");
    const [width, setWidth] = useState<number>(selectedEl.width || 300);
    const [height, setHeight] = useState<number>(selectedEl.height || 200);
    const [selectedImage, setSelectedImage] = useState<File>();
    const [loading, setLoading] = useState(false);
    const [borderRadius, setBorderRadius] = useState(
        selectedEl.style?.borderRadius || "0px"
    );
    const [preview, setPreview] = useState(selectedEl.src || "");
    const [activeTransforms, setActiveTransforms] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [error, setError] = useState<string>("");

    // Toggle transform
    const toggleTransform = (value: string) => {
        setActiveTransforms((prev) =>
            prev.includes(value)
                ? prev.filter((t) => t !== value)
                : [...prev, value]
        );
    };



    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
            setError("");
        }

    };

    const saveUploadedFile = async () : Promise<void> => {
        if (!selectedImage) {
            setError("Please select an image first");
            toast.error('Please select an image first');
            return;
        }
        setLoading(true);
        setError("");

        const formData = new FormData();
        formData.append('image', selectedImage);

        try {
            const response = await api.post('/api/image/upload', formData,{
                    headers: {
                    'Content-Type': 'multipart/form-data',
                    }
            });
            
            if (response.statusText !== 'OK') {
                toast.error('Upload failed');
                throw new Error('Upload failed');
            }
            const data: UploadResponse = await response.data;

            if (selectedEl) {
                // Get the actual DOM element
               const iFrameEl = document.getElementById("ai-preview-iframe") as HTMLIFrameElement;
               const imgElement = iFrameEl.contentDocument?.querySelector(".ai-selected-element") as HTMLImageElement;
                if(imgElement) 
                    imgElement.setAttribute('src', data.url + "?tr=");
            }
            setPreview(data.url);
        } catch (err) {
            console.error('Upload error:', err);
            toast.error('Upload error: ' + (err instanceof AxiosError ? err.response?.data?.error : 'Image upload failed'));
            setError(err instanceof Error ? err.message : 'Upload failed');
        } finally {
            setLoading(false);
        }

    }

    const openFileDialog = () => {
        fileInputRef.current?.click();
    };

    const GenerateAiImage = async () : Promise<void> => {
        if (!altText.trim()) {
            setError("Please enter a prompt");
            toast.error('Please enter a prompt');
            return;
        }
        setLoading(true);
        setError("");

        try {
            const response = await api.post('/api/image/generate-ai-image', {
                prompt: altText 
            });

            if (response.statusText !== 'OK') {
                toast.error('Generation failed');
                throw new Error('Generation failed');
            }

            const data: GenerateAiImageResponse = await response.data;

            setPreview(data.url);
            if (selectedEl) {
                selectedEl.src = data.url;
            }
        } catch (err) {
            console.error('AI generation error:', err);
            toast.error('AI generation error: ' + (err instanceof AxiosError ? err.response?.data?.error : 'Generation failed'));
            setError(err instanceof Error ? err.message : 'Generation failed');
        } finally {
            setLoading(false);
        }    

    }

    const ApplyTransformation = (trValue: string) => {
        setLoading(true);

        if (!preview.includes(trValue)) {

            const url = preview + trValue + ','
            setPreview(url);
            selectedEl.setAttribute('src', url)
        }
        else {
            const url = preview.replaceAll(trValue + ",", "");
            setPreview(url);
            selectedEl.setAttribute('src', url)
        }
    }

    return (
        <div className='absolute top-4 right-4 w-100 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50 animate-fade-in fade-in'>
        <div className='flex justify-between items-center mb-4'>
            <h2 className="flex gap-2 items-center font-bold font-semibold text-gray-800">
                <ImageIcon /> Click on the image to change
            </h2>
            <button onClick={onClose} className='p-1 hover:bg-gray-100 rounded-full'>
                <X className='w-4 h-4 text-gray-500'/>
            </button>
</div>
        <div className="w-96 shadow p-4 space-y-4">
            
            {/* Preview (clickable) */}
            <div className="flex justify-center">
                <img
                    src={preview}
                    alt={altText}
                    className="max-h-40 object-contain border rounded cursor-pointer hover:opacity-80"
                    onClick={openFileDialog}
                    onLoad={() => setLoading(false)}
                />
            </div>

            {/* Hidden file input */}
            <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
            />

            {/* Upload Button */}
            <Button
                type="button"
                
                className="w-full font-semibold text-gray-800"
                onClick={saveUploadedFile}
                disabled={loading}
            >
                {loading && <Loader2Icon className="animate-spin" />}   Upload Image
            </Button>

            {/* Alt text */}
            <div className="hidden">
                <label className="text-sm font-semibold text-gray-800">Prompt</label>
                <Input
                    type="text"
                    value={altText}
                    onChange={(e) => setAltText(e.target.value)}
                    placeholder="Enter alt text"
                    className="block text-xs font-medium text-gray-500 mb-1"
                />
            </div>

            <Button className="w-full font-semibold text-gray-800 hidden" onClick={GenerateAiImage}
                disabled={loading}>
                {loading && <Loader2Icon className="animate-spin" />}  Generate AI Image
            </Button>

            {/* Transform Buttons */}
            <div  className="hidden">
                <label className="text-sm mb-1 block font-semibold text-gray-800">AI Transform</label>
                <div className="flex gap-2 flex-wrap">
                    <TooltipProvider>
                        {transformOptions.map((opt) => {
                            const applied = activeTransforms.includes(opt.value);
                            return (
                                <Tooltip key={opt.value}>
                                    <TooltipTrigger asChild>
                                        <Button
                                            type="button"
                                            variant={preview.includes(opt.transformation) ? 'default' : "outline"}
                                            className="flex items-center justify-center p-2 text-gray-800"
                                            onClick={() => ApplyTransformation(opt.transformation)}
                                        >
                                            {opt.icon}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        {opt.label} {applied && "(Applied)"}
                                    </TooltipContent>
                                </Tooltip>
                            );
                        })}
                    </TooltipProvider>
                </div>
            </div>

            {/* Conditional Resize Inputs */}
            {activeTransforms.includes("resize") && (
                <div className="flex gap-2 hidden">
                    <div className="flex-1">
                        <label className="text-sm font-semibold text-gray-800">Width</label>
                        <Input
                            type="number"
                            value={width}
                            onChange={(e) => setWidth(Number(e.target.value))}
                            className="mt-1"
                        />
                    </div>
                    <div className="flex-1">
                        <label className="text-sm font-semibold text-gray-800">Height</label>
                        <Input
                            type="number"
                            value={height}
                            onChange={(e) => setHeight(Number(e.target.value))}
                            className="mt-1"
                        />
                    </div>
                </div>
            )}

            {/* Border Radius */}
            <div  className="hidden">
                <label className="text-sm font-semibold text-gray-800">Border Radius</label>
                <Input
                    type="text"
                    value={borderRadius}
                    onChange={(e) => {
                        const value = e.target.value;
                        setBorderRadius(value);
                        if (selectedEl) {
                            selectedEl.style.borderRadius = value;
                        }
                    }}
                    placeholder="e.g. 8px or 50%"
                    className="block text-xs font-medium text-gray-500 mb-1"
                />
            </div>
        </div>
        </div>
    );
}

export default ImageSettingSection;
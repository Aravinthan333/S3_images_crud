import { useState, useEffect } from "react";
import axios from "axios";

const App = () => {
  const [caption, setCaption] = useState("");
  const [image, setImage] = useState();
  const [gallary, setGallary] = useState([]);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData();

    formData.append("image", image);
    formData.append("caption", caption);

    await axios.post("http://localhost:4000/posts", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    setLoading(false);
  };

  const deletePost = async (id) => {
    setLoading(true);
    await axios.delete(`http://localhost:4000/posts/${id}`);
    setGallary(gallary.filter((item) => item.id !== id));

    setLoading(false);
  };

  useEffect(() => {
    const fetchGallary = async () => {
      const response = await axios.get("http://localhost:4000/posts");
      console.log(response.data.posts);
      setGallary(response.data.posts);
    };
    fetchGallary();
  }, [loading]);

  return (
    <>
      <form onSubmit={submit}>
        <input
          type="text"
          name="caption"
          placeholder="caption"
          autoFocus
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
        />
        <input
          type="file"
          name="image"
          required
          accept="image/*"
          onChange={(e) => setImage(e.target.files[0])}
        />
        <button
          className="text-lg text-white bg-blue-500 font-semibold px-4 py-2 ml-5"
          type="submit"
        >
          {loading ? "Loading" : "Upload"}
        </button>
      </form>

      <div className="flex flex-wrap">
        {gallary.length < 1 ? (
          <div>Nothing</div>
        ) : (
          gallary.map((img) => {
            console.log(img);
            return (
              <img
                key={img.id}
                src={img.image}
                title={img.caption}
                className="w-[200px] h-[200px] m-2"
                onClick={() => deletePost(img.id)}
              />
            );
          })
        )}
      </div>
    </>
  );
};

export default App;

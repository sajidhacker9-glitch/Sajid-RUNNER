// ------------------------------
// COMPLETE Endless Runner - Unity C# Full Starter Kit
// For: Sajid Khan
// NOTE: This single file contains multiple script files separated by headers for easy copy-paste
// Create separate C# files in Assets/Scripts with the indicated names (filename: // ---- name)
// Unity version: 2020.3+ recommended
// Mobile-ready: includes touch swipe/tap input, object pooling, UI, save system, ad/IAP stubs
// Localization: Urdu/Hinglish comments for clarity
// ------------------------------------------------

// ---- PlayerController.cs ----
using UnityEngine;
using System.Collections;

public class PlayerController : MonoBehaviour
{
    public static PlayerController Instance;

    [Header("Lanes & Movement")]
    public float laneOffset = 2f; // x positions: -laneOffset, 0, +laneOffset
    public int currentLane = 1; // 0=left,1=mid,2=right
    public float laneSwitchSpeed = 10f;

    [Header("Forward Motion")]
    public float forwardSpeed = 8f;
    public float speedIncreaseRate = 0.0025f; // per meter/time

    [Header("Jump / Gravity")]
    public float jumpForce = 10f;
    public float gravity = -30f;

    [Header("Roll")]
    public float rollDuration = 0.9f;

    [Header("Hoverboard")]
    public bool hoverboardActive = false;
    public float hoverboardDuration = 6f;

    CharacterController cc;
    Vector3 moveVector;
    float verticalVelocity = 0f;
    bool isRolling = false;
    float rollTimer = 0f;

    // Touch input helper reference
    SwipeController swipe;

    // Double tap detection for hoverboard
    float lastTapTime = 0f;
    public float doubleTapMaxDelay = 0.35f;

    void Awake()
    {
        if (Instance == null) Instance = this; else Destroy(gameObject);
    }

    void Start()
    {
        cc = GetComponent<CharacterController>();
        swipe = FindObjectOfType<SwipeController>();
        moveVector = Vector3.zero;
    }

    void Update()
    {
        // forward
        transform.Translate(Vector3.forward * forwardSpeed * Time.deltaTime);
        // increase speed gradually
        forwardSpeed += speedIncreaseRate * Time.deltaTime;

        // Handle lane movement
        float targetX = (currentLane - 1) * laneOffset;
        float deltaX = targetX - transform.localPosition.x;
        float moveX = deltaX * laneSwitchSpeed * Time.deltaTime;

        // Vertical
        if (cc.isGrounded)
        {
            if (verticalVelocity < 0) verticalVelocity = -1f;
            if (swipe.SwipeUp && !isRolling) Jump();
            if (swipe.SwipeDown && !isRolling) StartCoroutine(Roll());
        }
        else
        {
            verticalVelocity += gravity * Time.deltaTime;
        }

        // apply movement
        Vector3 motion = new Vector3(moveX, verticalVelocity * Time.deltaTime, 0);
        cc.Move(motion * 60f * Time.deltaTime);

        // lane changes
        if (swipe.SwipeLeft) ChangeLane(-1);
        if (swipe.SwipeRight) ChangeLane(1);

        // Tap/double tap
        if (swipe.Tap)
        {
            float t = Time.time;
            if (t - lastTapTime <= doubleTapMaxDelay)
            {
                ActivateHoverboard();
            }
            lastTapTime = t;
        }

        // hoverboard timer handled in coroutine
    }

    void ChangeLane(int dir)
    {
        currentLane = Mathf.Clamp(currentLane + dir, 0, 2);
    }

    void Jump()
    {
        verticalVelocity = jumpForce;
        // TODO: trigger animator jump
    }

    IEnumerator Roll()
    {
        isRolling = true;
        rollTimer = 0f;
        // TODO: lower collider height or switch capsule size
        yield return new WaitForSeconds(rollDuration);
        isRolling = false;
    }

    public void ActivateHoverboard()
    {
        if (hoverboardActive) return; // already active
        hoverboardActive = true;
        StartCoroutine(HoverboardRoutine());
        // TODO: VFX, sound
    }

    IEnumerator HoverboardRoutine()
    {
        float t = 0f;
        while (t < hoverboardDuration)
        {
            t += Time.deltaTime;
            yield return null;
        }
        hoverboardActive = false;
    }

    // Called by obstacles when collision happens
    public bool TryHitObstacle()
    {
        if (hoverboardActive)
        {
            hoverboardActive = false; // consume
            return false; // not dead
        }
        // die
        return true;
    }
}

// ---- SwipeController.cs ----
using UnityEngine;

// Simple mobile swipe/tap detector. Attach to an empty GameObject.
public class SwipeController : MonoBehaviour
{
    public bool SwipeLeft { get; private set; }
    public bool SwipeRight { get; private set; }
    public bool SwipeUp { get; private set; }
    public bool SwipeDown { get; private set; }
    public bool Tap { get; private set; }

    Vector2 startTouch, swipeDelta;
    bool isDragging = false;

    public float deadZone = 50f; // minimum pixels

    void Update()
    {
        SwipeLeft = SwipeRight = SwipeUp = SwipeDown = Tap = false;

        #if UNITY_EDITOR || UNITY_STANDALONE
        // Keyboard for testing
        if (Input.GetKeyDown(KeyCode.LeftArrow)) SwipeLeft = true;
        if (Input.GetKeyDown(KeyCode.RightArrow)) SwipeRight = true;
        if (Input.GetKeyDown(KeyCode.UpArrow)) SwipeUp = true;
        if (Input.GetKeyDown(KeyCode.DownArrow)) SwipeDown = true;
        if (Input.GetKeyDown(KeyCode.Space)) Tap = true;
        #endif

        if (Input.touchCount > 0)
        {
            Touch t = Input.touches[0];
            if (t.phase == TouchPhase.Began)
            {
                isDragging = true;
                startTouch = t.position;
            }
            else if (t.phase == TouchPhase.Ended || t.phase == TouchPhase.Canceled)
            {
                if (!isDragging) return;
                isDragging = false;
                swipeDelta = t.position - startTouch;

                if (swipeDelta.magnitude < deadZone)
                {
                    // tap
                    Tap = true;
                }
                else
                {
                    float x = swipeDelta.x;
                    float y = swipeDelta.y;
                    if (Mathf.Abs(x) > Mathf.Abs(y))
                    {
                        if (x < 0) SwipeLeft = true; else SwipeRight = true;
                    }
                    else
                    {
                        if (y < 0) SwipeDown = true; else SwipeUp = true;
                    }
                }
            }
        }
    }
}

// ---- ObjectPooler.cs ----
using System.Collections.Generic;
using UnityEngine;

// Simple generic object pool
public class ObjectPooler : MonoBehaviour
{
    public static ObjectPooler Instance;

    [System.Serializable]
    public class Pool
    {
        public string tag;
        public GameObject prefab;
        public int size;
    }

    public List<Pool> pools;
    public Dictionary<string, Queue<GameObject>> poolDictionary;

    void Awake()
    {
        if (Instance == null) Instance = this; else Destroy(gameObject);
    }

    void Start()
    {
        poolDictionary = new Dictionary<string, Queue<GameObject>>();
        foreach (Pool p in pools)
        {
            Queue<GameObject> objectPool = new Queue<GameObject>();
            for (int i = 0; i < p.size; i++)
            {
                GameObject obj = Instantiate(p.prefab);
                obj.SetActive(false);
                objectPool.Enqueue(obj);
            }
            poolDictionary.Add(p.tag, objectPool);
        }
    }

    public GameObject SpawnFromPool(string tag, Vector3 position, Quaternion rotation)
    {
        if (!poolDictionary.ContainsKey(tag))
        {
            Debug.LogWarning("Pool with tag " + tag + " doesn't exist.");
            return null;
        }

        GameObject obj = poolDictionary[tag].Dequeue();
        obj.SetActive(true);
        obj.transform.position = position;
        obj.transform.rotation = rotation;

        poolDictionary[tag].Enqueue(obj);
        return obj;
    }
}

// ---- ObstacleSpawner.cs ----
using UnityEngine;

public class ObstacleSpawner : MonoBehaviour
{
    public Transform player;
    public float spawnAhead = 60f;
    public float tileLength = 20f;
    public int initialTiles = 5;

    float lastSpawnZ;

    public string[] obstaclePoolTags; // tags defined in ObjectPooler
    public string coinTag;
    public string[] powerupTags;
    public string trainTag;

    void Start()
    {
        lastSpawnZ = player.position.z;
        for (int i = 0; i < initialTiles; i++) SpawnTile();
    }

    void Update()
    {
        if (player.position.z + spawnAhead > lastSpawnZ + tileLength)
        {
            SpawnTile();
        }
    }

    void SpawnTile()
    {
        float spawnZ = lastSpawnZ + tileLength;

        // spawn obstacles on lanes
        for (int lane = 0; lane < 3; lane++)
        {
            float laneX = (lane - 1) * 2f; // use same offset as PlayerController default
            Vector3 pos = new Vector3(laneX, 0, spawnZ + Random.Range(-3f, 3f));
            int r = Random.Range(0, 100);
            if (r < 45)
            {
                // obstacle
                string tag = obstaclePoolTags[Random.Range(0, obstaclePoolTags.Length)];
                ObjectPooler.Instance.SpawnFromPool(tag, pos, Quaternion.identity);
            }
            else if (r < 70)
            {
                // coins
                for (int i = 0; i < 5; i++)
                {
                    Vector3 cpos = new Vector3(laneX, 1.2f, spawnZ + i * 1.2f);
                    ObjectPooler.Instance.SpawnFromPool(coinTag, cpos, Quaternion.identity);
                }
            }
            else if (r < 85)
            {
                // powerup
                string p = powerupTags[Random.Range(0, powerupTags.Length)];
                ObjectPooler.Instance.SpawnFromPool(p, pos + Vector3.up * 0.7f, Quaternion.identity);
            }
        }

        // occasional train covering all lanes
        if (Random.value < 0.18f)
        {
            Vector3 trainPos = new Vector3(0, 0, spawnZ + 3f);
            ObjectPooler.Instance.SpawnFromPool(trainTag, trainPos, Quaternion.identity);
        }

        lastSpawnZ = spawnZ;
    }
}

// ---- Coin.cs ----
using UnityEngine;

public class Coin : MonoBehaviour
{
    public int value = 1;
    void OnTriggerEnter(Collider other)
    {
        if (other.CompareTag("Player"))
        {
            GameManager.Instance.AddCoins(value);
            gameObject.SetActive(false);
        }
    }
}

// ---- PowerUp.cs ----
using UnityEngine;

public enum PowerUpType { Jetpack, Magnet, SuperSneakers, DoubleScore, Hoverboard }

public class PowerUp : MonoBehaviour
{
    public PowerUpType type;
    public float duration = 6f;

    void OnTriggerEnter(Collider other)
    {
        if (other.CompareTag("Player"))
        {
            Apply(other.GetComponent<PlayerController>());
            gameObject.SetActive(false);
        }
    }

    void Apply(PlayerController pc)
    {
        switch (type)
        {
            case PowerUpType.Jetpack:
                StartCoroutine(JetpackRoutine(pc));
                break;
            case PowerUpType.Magnet:
                GameManager.Instance.ActivateMagnet(duration);
                break;
            case PowerUpType.SuperSneakers:
                StartCoroutine(SuperSneakersRoutine(pc));
                break;
            case PowerUpType.DoubleScore:
                GameManager.Instance.ActivateMultiplier(2, duration);
                break;
            case PowerUpType.Hoverboard:
                pc.ActivateHoverboard();
                break;
        }
    }

    System.Collections.IEnumerator JetpackRoutine(PlayerController pc)
    {
        float oldGravity = pc.gravity;
        float oldJump = pc.jumpForce;
        pc.gravity = -8f;
        pc.jumpForce = oldJump * 1.2f;
        // lift player gradually if needed
        yield return new WaitForSeconds(duration);
        pc.gravity = oldGravity;
        pc.jumpForce = oldJump;
    }

    System.Collections.IEnumerator SuperSneakersRoutine(PlayerController pc)
    {
        float oldJump = pc.jumpForce;
        pc.jumpForce = oldJump * 1.6f;
        yield return new WaitForSeconds(duration);
        pc.jumpForce = oldJump;
    }
}

// ---- Obstacle.cs ----
using UnityEngine;

public class Obstacle : MonoBehaviour
{
    void OnTriggerEnter(Collider other)
    {
        if (other.CompareTag("Player"))
        {
            var pc = other.GetComponent<PlayerController>();
            if (pc != null)
            {
                bool dead = pc.TryHitObstacle();
                if (dead)
                {
                    // Game Over
                    Time.timeScale = 0f; // pause
                    UIManager.Instance.ShowGameOver();
                }
                else
                {
                    // consume obstacle if needed
                    gameObject.SetActive(false);
                }
            }
        }
    }
}

// ---- Train.cs ----
using UnityEngine;

public class Train : MonoBehaviour
{
    public enum TrainType { Moving, Parked }
    public TrainType type = TrainType.Moving;
    public float speed = 6f;

    void Update()
    {
        if (type == TrainType.Moving)
        {
            transform.Translate(Vector3.forward * speed * Time.deltaTime);
        }
    }

    void OnTriggerEnter(Collider other)
    {
        if (other.CompareTag("Player"))
        {
            var pc = other.GetComponent<PlayerController>();
            if (pc != null)
            {
                bool dead = pc.TryHitObstacle();
                if (dead)
                {
                    Time.timeScale = 0f;
                    UIManager.Instance.ShowGameOver();
                }
                else
                {
                    gameObject.SetActive(false);
                }
            }
        }
    }
}

// ---- GameManager.cs ----
using UnityEngine;

public class GameManager : MonoBehaviour
{
    public static GameManager Instance;

    public int coins = 0;
    public int keys = 0;
    public int distance = 0;

    public float scoreMultiplier = 1f;
    float multiplierTimer = 0f;

    bool magnetActive = false;
    float magnetTimer = 0f;

    void Awake()
    {
        if (Instance == null) Instance = this; else Destroy(gameObject);
    }

    void Update()
    {
        // distance based on player's z
        if (PlayerController.Instance != null)
        {
            distance = Mathf.FloorToInt(PlayerController.Instance.transform.position.z);
        }

        if (multiplierTimer > 0)
        {
            multiplierTimer -= Time.deltaTime;
            if (multiplierTimer <= 0) scoreMultiplier = 1f;
        }

        if (magnetActive)
        {
            magnetTimer -= Time.deltaTime;
            if (magnetTimer <= 0) magnetActive = false;
        }
    }

    public void AddCoins(int v)
    {
        coins += v;
        UIManager.Instance.UpdateCoins(coins);
    }

    public void ActivateMagnet(float duration)
    {
        magnetActive = true;
        magnetTimer = duration;
        // magnet effect handled by a Magnet script on coins if implemented
    }

    public void ActivateMultiplier(int mul, float duration)
    {
        scoreMultiplier = mul;
        multiplierTimer = duration;
    }

    public float GetScore()
    {
        return distance * scoreMultiplier;
    }

    public void SaveProgress()
    {
        SaveSystem.Save(this);
    }
}

// ---- UIManager.cs ----
using UnityEngine;
using UnityEngine.UI;

public class UIManager : MonoBehaviour
{
    public static UIManager Instance;

    public Text scoreText;
    public Text coinsText;
    public GameObject gameOverPanel;
    public GameObject pausePanel;
    public Button resumeButton;

    void Awake()
    {
        if (Instance == null) Instance = this; else Destroy(gameObject);
    }

    void Start()
    {
        UpdateCoins(GameManager.Instance.coins);
        gameOverPanel.SetActive(false);
        pausePanel.SetActive(false);
    }

    void Update()
    {
        scoreText.text = "Score: " + Mathf.FloorToInt(GameManager.Instance.GetScore()).ToString();
    }

    public void UpdateCoins(int v)
    {
        coinsText.text = v.ToString();
    }

    public void ShowGameOver()
    {
        gameOverPanel.SetActive(true);
    }

    public void OnPlayButton()
    {
        Time.timeScale = 1f;
        // reload scene or reset values
    }

    public void OnPause()
    {
        Time.timeScale = 0f;
        pausePanel.SetActive(true);
    }

    public void OnResume()
    {
        Time.timeScale = 1f;
        pausePanel.SetActive(false);
    }
}

// ---- SaveSystem.cs ----
using UnityEngine;

[System.Serializable]
public class SaveData
{
    public int coins;
    public int keys;
}

public static class SaveSystem
{
    public static void Save(GameManager gm)
    {
        SaveData sd = new SaveData();
        sd.coins = gm.coins;
        sd.keys = gm.keys;
        string json = JsonUtility.ToJson(sd);
        PlayerPrefs.SetString("save", json);
        PlayerPrefs.Save();
    }

    public static void Load(GameManager gm)
    {
        if (!PlayerPrefs.HasKey("save")) return;
        string json = PlayerPrefs.GetString("save");
        SaveData sd = JsonUtility.FromJson<SaveData>(json);
        gm.coins = sd.coins;
        gm.keys = sd.keys;
    }
}

// ---- AdsManager.cs (stub) ----
using UnityEngine;

// NOTE: Implement Unity Ads or AdMob SDK per platform. These are placeholders.
public class AdsManager : MonoBehaviour
{
    public static AdsManager Instance;
    void Awake() { if (Instance==null) Instance = this; else Destroy(gameObject); }

    public void ShowRewardedAd(System.Action onComplete)
    {
        // Integrate SDK and call onComplete() after reward earned
        Debug.Log("ShowRewardedAd called - implement SDK");
        onComplete?.Invoke();
    }
}

// ---- IAPManager.cs (stub) ----
using UnityEngine;

public class IAPManager : MonoBehaviour
{
    public static IAPManager Instance;
    void Awake(){ if (Instance==null) Instance = this; else Destroy(gameObject); }

    public void PurchaseCoinsPack(string packId, System.Action<bool> callback)
    {
        // integrate Unity IAP and call callback(true) if success
        Debug.Log("PurchaseCoinsPack: " + packId);
        callback?.Invoke(true);
    }
}

// ---- LeaderboardManager.cs (stub) ----
using UnityEngine;

public class LeaderboardManager : MonoBehaviour
{
    public void SubmitScore(int score)
    {
        // integrate platform leaderboard or online server
        Debug.Log("SubmitScore: " + score);
    }
}

// ---- Notes.txt ----
/*
Next steps / Integration checklist:
1) Create prefabs for obstacles, coins, powerups, trains. Tag them in ObjectPooler pools.
2) Replace placeholder TODOs: animations, VFX, lowering collider during roll.
3) Implement Ads and IAP via respective SDKs and platform settings.
4) Use ObjectPooler pools for all frequently spawned objects.
5) Add audio manager for music and SFX.
6) Polish: shaders, LODs, mobile quality settings.
7) Optimize: bake navmesh if needed, occlusion culling, and reduce overdraw.
8) Testing: test across low-end devices and adjust particle counts and textures.

Filenames to create (one file per script):
- PlayerController.cs
- SwipeController.cs
- ObjectPooler.cs
- ObstacleSpawner.cs
- Coin.cs
- PowerUp.cs
- Obstacle.cs
- Train.cs
- GameManager.cs
- UIManager.cs
- SaveSystem.cs
- AdsManager.cs
- IAPManager.cs
- LeaderboardManager.cs

Agar aap chahen, main in files ko alag-alag detailed versions (mobile input improved with gesture smoothing, touch hold detection, better pooling with expansion, fullscreen UI prefab) bhi create kar sakta hoon.
*/
